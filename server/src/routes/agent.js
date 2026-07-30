import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';
import { retrieveDocuments, retrievalConfidence, inferCategory } from '../agent/retrieve.js';
import {
  ruleSafety,
  buildMessages,
  callOpenRouter,
  parseAgentJson,
  filterCitations,
  departmentForIntent,
  slaForPriority,
  inferPriority,
  slaMeta,
  ownerForDepartment,
  formatOwnerBlock,
} from '../agent/openrouter.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { enqueueRagCandidate } from '../agent/selfImprove.js';

const router = Router();

function profileFromUser(user) {
  if (!user || user.role !== 'student') return null;
  return {
    regNo: user.login_id,
    name: user.name,
    email: user.email,
    hostel: user.hostel,
    room: user.room,
    cgpa: user.cgpa,
  };
}

function buildPlan({ safety, query, retrieved, confidence, category, result, confirmed }) {
  const steps = [];
  steps.push({
    id: 'classify',
    label: 'Classify intent',
    detail: safety
      ? `Safety gate → ${safety.intent}`
      : `Campus intent → ${result.intent || 'pending'}`,
    status: 'done',
  });
  steps.push({
    id: 'retrieve',
    label: 'Retrieve trusted docs',
    detail: retrieved.length
      ? `Found ${retrieved.length} chunk(s)${category ? ` in ${category}` : ''} (confidence ${Math.round(confidence * 100)}%)`
      : 'No approved document matched — will not invent policy',
    status: retrieved.length ? 'done' : 'warn',
    docs: retrieved.slice(0, 3).map((r) => ({ id: r.documentId, title: r.title, source: r.source, category: r.category })),
  });
  steps.push({
    id: 'decide',
    label: 'Decide action',
    detail: result.rationale || `${result.action}: ${result.reply?.slice(0, 80) || ''}`,
    status: 'done',
    action: result.action,
  });
  if (result.action === 'ESCALATE') {
    steps.push({
      id: 'handoff',
      label: confirmed ? 'Create handoff ticket' : 'Await student confirmation',
      detail: confirmed
        ? `Route to ${departmentForIntent(result.intent)}`
        : 'Controllable agent: student must confirm before filing',
      status: confirmed ? 'done' : 'pending',
    });
  } else if (result.action === 'ANSWER') {
    steps.push({
      id: 'ground',
      label: 'Grounded reply',
      detail: result.citations?.length
        ? `Cite ${(result.citations[0].source || result.citations[0].title)}`
        : 'Answer blocked without citation',
      status: result.citations?.length ? 'done' : 'warn',
    });
  } else if (result.action === 'REFUSAL') {
    steps.push({ id: 'refuse', label: 'Safe refusal', detail: 'Off-topic or unsafe request blocked', status: 'done' });
  } else {
    steps.push({ id: 'clarify', label: 'Collect slots', detail: 'Ask for missing campus details', status: 'done' });
  }
  return {
    query,
    confidence,
    category,
    action: result.action,
    rationale: result.rationale || '',
    handoffNeed: result.handoffNeed || '',
    steps,
  };
}

function localFallback(query, retrieved, profile) {
  const safety = ruleSafety(query);
  if (safety) return { ...safety, citations: [], rationale: 'Rule-based safety refusal', handoffNeed: '' };

  const lower = query.toLowerCase();
  const hinglish = /[^\x00-\x7F]/.test(query) || /\b(bhai|mere|kahan|hai|ka|kripya|please)\b/i.test(query);
  const top = retrieved[0];
  const conf = retrievalConfidence(retrieved);

  // OD / on-duty (Hinglish + English) — exam vs event conflict is High priority
  if (/\bod\b|on[\s-]?duty|duty leave|ऑफिशियल ड्यूटी|ओडी/.test(lower) || /(paper|exam|event).*(od|duty)|(od|duty).*(paper|exam|event)/i.test(query)) {
    return {
      action: 'ESCALATE',
      reply: hinglish
        ? `OD / on-duty के लिए Registrar desk approval लगता है। Exam (${query.match(/\d{1,2}:\d{2}/)?.[0] || 'your paper time'}) और event overlap है तो High priority ticket फाइल कर सकते हैं — Confirm दबाएँ। ETA ≈ 30 minutes · Owner: Dr. Neha Kapoor (Assistant Registrar).`
        : `On-duty (OD) leave for exam/event conflicts needs Registrar approval. I can file a High-priority request — confirm to notify Admissions & Registrar. ETA ≈ 30 minutes · Owner: Dr. Neha Kapoor.`,
      intent: 'OD_LEAVE',
      priority: 'High',
      slots: {},
      citationIds: [],
      citations: [],
      rationale: 'OD/exam conflict needs human approval',
      handoffNeed: 'Review OD request for exam vs event timing conflict and approve/reject',
    };
  }

  if (/(maintenance|broken|leak|fan|light|not working|repair|duplicate.*key|lost.*key)/.test(lower)) {
    const slots = {};
    if (profile?.hostel) slots.blockName = profile.hostel;
    if (profile?.room) slots.roomNumber = profile.room;
    if (slots.blockName && slots.roomNumber) {
      return {
        action: 'ESCALATE',
        reply: hinglish
          ? `Hostel maintenance के लिए ${slots.blockName} room ${slots.roomNumber} का ticket फाइल कर सकता हूँ — Confirm दबाएँ।`
          : `I can file a hostel maintenance request for ${slots.blockName} room ${slots.roomNumber}. Confirm to notify the facilities team.`,
        intent: 'MAINTENANCE_REQUEST',
        priority: 'Medium',
        slots,
        citationIds: [],
        citations: [],
        rationale: 'Action needed beyond FAQ — route to Hostel Facilities',
        handoffNeed: 'Inspect/repair reported hostel facility issue',
      };
    }
    return {
      action: 'CLARIFY',
      reply: hinglish
        ? 'Hostel maintenance ticket के लिए Block और Room number बताओ।'
        : 'I can file a hostel maintenance request. Please share your Block and Room number.',
      intent: 'MAINTENANCE_REQUEST',
      priority: 'Medium',
      slots,
      citationIds: [],
      citations: [],
      rationale: 'Missing room/block slots before handoff',
      handoffNeed: '',
    };
  }

  // Wi‑Fi / portal / scholarship — prefer grounded ANSWER when docs exist (demo-critical)
  if (top && conf >= 0.4) {
    if (/(wifi|wi-?fi|vitb-secure|internet|mac\s*address|network)/i.test(query)) {
      return {
        action: 'ANSWER',
        reply: `${top.content.slice(0, 900)}\n\n[Source: ${top.source}]`,
        intent: 'WIFI_ISSUE',
        priority: 'Low',
        slots: {},
        citationIds: [top.documentId],
        citations: [top],
        rationale: 'Grounded Wi‑Fi / network policy (local fallback)',
        handoffNeed: '',
      };
    }
    if (/(password|portal|otp|login|forgot.*pin)/i.test(query)) {
      const slots = {};
      if (profile?.regNo) slots.studentID = profile.regNo;
      if (profile?.email) slots.registeredEmail = profile.email;
      return {
        action: 'ANSWER',
        reply: `${top.content.slice(0, 900)}\n\n[Source: ${top.source}]`,
        intent: 'PASSWORD_RESET',
        priority: 'Medium',
        slots,
        citationIds: [top.documentId],
        citations: [top],
        rationale: 'Grounded portal / password policy (local fallback)',
        handoffNeed: '',
      };
    }
    if (/(scholarship|merit|cgpa|income)/i.test(query)) {
      return {
        action: 'ANSWER',
        reply: `${top.content.slice(0, 900)}\n\n[Source: ${top.source}]`,
        intent: 'SCHOLARSHIP_INQUIRY',
        priority: 'Low',
        slots: profile?.cgpa != null ? { cgpa: profile.cgpa } : {},
        citationIds: [top.documentId],
        citations: [top],
        rationale: 'Grounded scholarship policy (local fallback)',
        handoffNeed: '',
      };
    }
    if (/(fee|refund|tuition|payment)/i.test(query)) {
      return {
        action: 'ANSWER',
        reply: `${top.content.slice(0, 900)}\n\n[Source: ${top.source}]`,
        intent: 'FEE_REFUND',
        priority: 'Medium',
        slots: {},
        citationIds: [top.documentId],
        citations: [top],
        rationale: 'Grounded fees policy (local fallback)',
        handoffNeed: '',
      };
    }
  }

  if (retrieved.length && conf >= 0.5) {
    return {
      action: 'ANSWER',
      reply: `${top.content.slice(0, 900)}\n\n[Source: ${top.source}]`,
      intent: 'GENERAL_ACADEMIC',
      priority: 'Medium',
      slots: {},
      citationIds: [top.documentId],
      citations: [top],
      rationale: 'Grounded in retrieved campus policy (local fallback)',
      handoffNeed: '',
    };
  }

  return {
    action: 'ESCALATE',
    reply: hinglish
      ? 'Approved campus documents में confident match नहीं मिला। सही department को ticket भेज सकते हैं — Confirm दबाएँ।'
      : 'I could not find a confident match in approved campus documents. I can create a support ticket for the right department — confirm to file.',
    intent: 'GENERAL_ACADEMIC',
    priority: 'Medium',
    slots: {},
    citationIds: [],
    citations: [],
    rationale: 'Low retrieval confidence — escalate rather than invent',
    handoffNeed: 'Human review of student query with no grounded FAQ match',
  };
}

function fillSlots(intent, slots, profile) {
  const next = { ...(slots || {}) };
  if (intent === 'MAINTENANCE_REQUEST' && profile) {
    if (!next.blockName) next.blockName = profile.hostel;
    if (!next.roomNumber) next.roomNumber = profile.room;
  }
  if (intent === 'PASSWORD_RESET' && profile) {
    if (!next.studentID) next.studentID = profile.regNo;
    if (!next.registeredEmail) next.registeredEmail = profile.email;
  }
  if (intent === 'SCHOLARSHIP_INQUIRY' && profile && next.cgpa === undefined) {
    next.cgpa = profile.cgpa;
  }
  return next;
}

function createTicket({ profile, user, query, result, plan }) {
  const id = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
  const department = departmentForIntent(result.intent);
  const priority = result.priority || inferPriority(query, result.intent);
  const meta = slaMeta(priority);
  const owner = ownerForDepartment(department);
  const slots = fillSlots(result.intent, result.slots, profile);
  const handoffSummary = [
    result.handoffNeed || 'Staff follow-up required',
    `Intent: ${result.intent}`,
    `Priority: ${priority} · ETA ${meta.etaLabel}`,
    `Owner: ${owner.name} · ${owner.phone} · ${owner.email}`,
    `Slots: ${JSON.stringify(slots)}`,
    result.rationale ? `Agent rationale: ${result.rationale}` : '',
  ].filter(Boolean).join(' | ');

  db.prepare(`
    INSERT INTO tickets (
      id, owner_reg_no, owner_email, owner_name, student_query, intent, department,
      priority, sentiment, slots_json, status, workflow, sla_duration_ms, escalated_at,
      handoff_summary, agent_plan_json, staff_notes_json,
      owner_contact_name, owner_contact_phone, owner_contact_email, eta_label
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'open', ?, datetime('now'), ?, ?, '[]', ?, ?, ?, ?)
  `).run(
    id,
    profile?.regNo || user.login_id,
    profile?.email || user.email,
    profile?.name || user.name,
    query,
    result.intent || 'GENERAL_ACADEMIC',
    department,
    priority,
    'Neutral',
    JSON.stringify(slots),
    meta.slaMs,
    handoffSummary,
    plan ? JSON.stringify(plan) : null,
    owner.name,
    owner.phone,
    owner.email,
    meta.etaLabel,
  );

  db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
    .run('HANDOFF', `Agent escalated ${id} → ${department}: ${handoffSummary.slice(0, 160)}`);

  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  return {
    id: row.id,
    ownerRegNo: row.owner_reg_no,
    ownerEmail: row.owner_email,
    ownerName: row.owner_name,
    studentQuery: row.student_query,
    intent: row.intent,
    department: row.department,
    priority: row.priority,
    sentiment: row.sentiment,
    slots,
    status: row.status,
    workflow: row.workflow || 'open',
    slaDuration: row.sla_duration_ms,
    etaLabel: row.eta_label || meta.etaLabel,
    contact: {
      name: row.owner_contact_name || owner.name,
      phone: row.owner_contact_phone || owner.phone,
      email: row.owner_contact_email || owner.email,
      desk: owner.desk,
      title: owner.title,
    },
    escalatedAt: new Date(row.escalated_at).getTime(),
    timestamp: new Date(row.escalated_at).toLocaleString(),
    handoffSummary: row.handoff_summary,
    agentPlan: plan,
  };
}

router.post(
  '/chat',
  authRequired,
  rateLimit({
    windowMs: 60_000,
    max: 18,
    keyFn: (req) => `chat:${req.user?.id || req.ip}`,
  }),
  async (req, res) => {
  const query = String(req.body?.message || req.body?.query || '').trim();
  if (!query) return res.status(400).json({ error: 'message required' });
  const confirmEscalate = Boolean(req.body?.confirmEscalate);
  const pending = req.body?.pendingEscalate || null;

  const profile = profileFromUser(req.user);
  const history = db.prepare(`
    SELECT role, content FROM messages
    WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 8
  `).all(req.user.id).reverse();

  db.prepare(`INSERT INTO messages (id, user_id, role, content) VALUES (?, ?, 'student', ?)`)
    .run(randomUUID(), req.user.id, query);

  // Controllable handoff: student confirmed a prior escalate proposal
  if (confirmEscalate && pending?.intent) {
    const result = {
      action: 'ESCALATE',
      reply: pending.reply || 'Filing your support ticket now.',
      intent: pending.intent,
      priority: pending.priority || 'Medium',
      slots: pending.slots || {},
      citations: [],
      rationale: pending.rationale || 'Student confirmed handoff',
      handoffNeed: pending.handoffNeed || '',
    };
    const plan = buildPlan({
      safety: null,
      query: pending.query || query,
      retrieved: [],
      confidence: 0,
      category: inferCategory(pending.query || query),
      result,
      confirmed: true,
    });
    const ticket = createTicket({
      profile,
      user: req.user,
      query: pending.query || query,
      result,
      plan,
    });
    const reply = `${result.reply}\n\nTicket ${ticket.id} filed with ${ticket.department}. Staff will see your details and handoff summary.`;
    db.prepare(`
      INSERT INTO messages (id, user_id, role, content, action, citations_json, trace_json)
      VALUES (?, ?, 'agent', ?, 'ESCALATE', '[]', ?)
    `).run(randomUUID(), req.user.id, reply, JSON.stringify(plan));
    return res.json({
      reply,
      action: 'ESCALATE',
      intent: result.intent,
      priority: result.priority,
      slots: result.slots,
      citations: [],
      ticket,
      plan,
      needsConfirmation: false,
      fallback: false,
    });
  }

  const safety = ruleSafety(query);
  let result;
  let retrieved = [];
  let confidence = 0;
  const category = inferCategory(query);

  if (safety) {
    result = { ...safety, citations: [], rationale: 'Safety / campus-scope refusal', handoffNeed: '' };
  } else {
    retrieved = retrieveDocuments(query, 5);
    confidence = retrievalConfidence(retrieved);
    try {
      const raw = await callOpenRouter({
        messages: buildMessages({ query, contextBlocks: retrieved, profile, history }),
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
        fallbackModels: [
          'openai/gpt-oss-20b:free',
          'nvidia/nemotron-nano-9b-v2:free',
          'meta-llama/llama-3.3-8b-instruct:free',
          'google/gemma-3-12b-it:free',
          'inclusionai/ling-3.0-flash:free',
        ],
        siteUrl: process.env.OPENROUTER_SITE_URL,
        appName: process.env.OPENROUTER_APP_NAME,
      });
      const parsed = parseAgentJson(raw);
      let citations = filterCitations(parsed.citationIds, retrieved);
      if (parsed.action === 'ANSWER' && citations.length === 0 && retrieved.length > 0 && confidence >= 0.55) {
        citations = [retrieved[0]];
      }
      // Escalation discipline: never ANSWER without grounded docs / confidence
      if (parsed.action === 'ANSWER' && (retrieved.length === 0 || confidence < 0.5 || citations.length === 0)) {
        parsed.action = confidence < 0.35 ? 'ESCALATE' : 'CLARIFY';
        parsed.reply = confidence < 0.35
          ? 'I cannot find an approved campus source I trust for that. I can escalate to staff — confirm to file a ticket.'
          : 'I am not fully confident from approved docs. Can you rephrase with more campus detail (department, form name, or room)?';
        parsed.rationale = 'Blocked ungrounded answer — Track 2 grounding rule';
        citations = [];
      }
      parsed.citationIds = citations.map((c) => c.documentId);
      parsed.priority = inferPriority(query, parsed.intent) || parsed.priority;
      result = { ...parsed, citations };

      // Action-needed hostel issues: prefer handoff over FAQ paste (ops usefulness)
      const needsFacilityAction = /(maintenance|broken|leak|fan|light|not working|repair|duplicate.*key|lost.*key)/i.test(query);
      if (needsFacilityAction && ['ANSWER', 'CLARIFY'].includes(result.action)) {
        const slots = fillSlots('MAINTENANCE_REQUEST', result.slots, profile);
        if (slots.blockName && slots.roomNumber) {
          result = {
            ...result,
            action: 'ESCALATE',
            intent: 'MAINTENANCE_REQUEST',
            slots,
            reply: result.action === 'ANSWER'
              ? `I found the maintenance policy, but I can also file a request for ${slots.blockName} room ${slots.roomNumber} so facilities acts on it.`
              : result.reply,
            rationale: 'Student needs facilities action — propose controllable handoff',
            handoffNeed: 'Inspect/repair hostel facility issue for reported room',
          };
        } else if (result.action === 'ANSWER') {
          result = {
            ...result,
            action: 'CLARIFY',
            intent: 'MAINTENANCE_REQUEST',
            reply: 'I can file a hostel maintenance request. Please share your Block and Room number.',
            rationale: 'Need room/block before handoff',
            handoffNeed: '',
          };
        }
      }
    } catch (err) {
      console.warn('[agent] OpenRouter fallback:', err.message);
      result = localFallback(query, retrieved, profile);
      result.fallback = true;
      result.fallbackError = err.message;
    }
  }

  // Controllable escalate: propose first, create only after confirm
  if (result.action === 'ESCALATE' && !confirmEscalate) {
    result.slots = fillSlots(result.intent, result.slots, profile);
    result.priority = inferPriority(query, result.intent);
    const plan = buildPlan({
      safety,
      query,
      retrieved,
      confidence,
      category,
      result,
      confirmed: false,
    });
    plan.action = 'ESCALATE_PROPOSE';
    const dept = departmentForIntent(result.intent);
    const owner = ownerForDepartment(dept);
    const meta = slaMeta(result.priority);
    plan.priority = result.priority;
    plan.etaLabel = meta.etaLabel;
    plan.owner = owner;
    const reply = `${result.reply}\n\nProposed handoff → ${dept} · ${meta.grade} · ETA ${meta.etaLabel}\n${formatOwnerBlock(owner, meta.etaLabel, result.priority)}\n\nTap Confirm to file a ticket with your details.`;
    db.prepare(`
      INSERT INTO messages (id, user_id, role, content, action, citations_json, trace_json)
      VALUES (?, ?, 'agent', ?, 'ESCALATE_PROPOSE', ?, ?)
    `).run(
      randomUUID(),
      req.user.id,
      reply,
      JSON.stringify(result.citations || []),
      JSON.stringify(plan)
    );
    return res.json({
      reply,
      action: 'ESCALATE_PROPOSE',
      intent: result.intent,
      priority: result.priority,
      etaLabel: meta.etaLabel,
      owner,
      slots: result.slots || {},
      citations: (result.citations || []).map((c) => ({
        id: c.documentId,
        title: c.title,
        source: c.source,
        category: c.category,
      })),
      ticket: null,
      plan,
      needsConfirmation: true,
      pendingEscalate: {
        query,
        intent: result.intent,
        priority: result.priority,
        slots: result.slots,
        reply: result.reply,
        rationale: result.rationale,
        handoffNeed: result.handoffNeed,
      },
      fallback: Boolean(result.fallback),
    });
  }

  let ticket = null;
  if (result.action === 'ESCALATE') {
    result.priority = inferPriority(query, result.intent);
    const plan = buildPlan({ safety, query, retrieved, confidence, category, result, confirmed: true });
    ticket = createTicket({ profile, user: req.user, query, result, plan });
    const ownerBlock = formatOwnerBlock(ticket.contact, ticket.etaLabel, ticket.priority);
    result.reply = `${result.reply}\n\nTicket ${ticket.id} → ${ticket.department}\n${ownerBlock}`;
  }

  let reply = result.reply;
  if (result.action === 'ANSWER' && result.citations?.length) {
    const src = result.citations[0].source;
    if (!reply.includes('[Source:')) reply = `${reply}\n\n[Source: ${src}]`;
    // Learn from grounded answers for self-improving RAG review queue
    enqueueRagCandidate({
      source: 'grounded_answer',
      query,
      answer: reply,
      intent: result.intent,
      category: category || 'Academics',
      confidence,
    });
  }

  if (result.action === 'ESCALATE_PROPOSE' || result.action === 'CLARIFY') {
    result.priority = result.priority || inferPriority(query, result.intent);
  }

  // Enrich propose with ETA/owner preview
  const previewDept = departmentForIntent(result.intent);
  const previewOwner = ownerForDepartment(previewDept);
  const previewMeta = slaMeta(result.priority || inferPriority(query, result.intent));

  const plan = buildPlan({
    safety,
    query,
    retrieved,
    confidence,
    category,
    result: { ...result, citations: result.citations },
    confirmed: result.action === 'ESCALATE',
  });
  plan.priority = result.priority || previewMeta.grade;
  plan.etaLabel = previewMeta.etaLabel;
  plan.owner = previewOwner;

  db.prepare(`
    INSERT INTO messages (id, user_id, role, content, action, citations_json, trace_json)
    VALUES (?, ?, 'agent', ?, ?, ?, ?)
  `).run(
    randomUUID(),
    req.user.id,
    reply,
    result.action,
    JSON.stringify(result.citations || []),
    JSON.stringify(plan)
  );

  res.json({
    reply,
    action: result.action,
    intent: result.intent,
    priority: result.priority || previewMeta.grade,
    etaLabel: previewMeta.etaLabel,
    owner: previewOwner,
    slots: result.slots || {},
    citations: (result.citations || []).map((c) => ({
      id: c.documentId,
      title: c.title,
      source: c.source,
      category: c.category,
    })),
    ticket,
    plan,
    needsConfirmation: false,
    fallback: Boolean(result.fallback),
  });
});

export default router;
