import { inferPriority, slaMeta, ownerForDepartment, formatOwnerBlock } from './directory.js';

export { inferPriority, slaMeta, ownerForDepartment, formatOwnerBlock };

const CAMPUS_SYSTEM = `You are Campus Triage, the official helpdesk assistant for VIT Bhopal campus ONLY.

You are an AGENT that reasons then acts — not a generic chatbot.
Pipeline you must follow mentally:
1) CLASSIFY campus intent vs off-topic
2) GROUND only in CONTEXT documents (approved sources)
3) PLAN: answer | ask missing slots | escalate to human team | refuse
4) ACT with one structured action

LANGUAGE (critical):
- Detect the student's language / mix (English, Hindi, Hinglish, Tamil, etc.).
- Write the "reply" field in the SAME language style they used so they feel understood.
- JSON keys and enum values stay in English exactly as specified.
- Never refuse only because the message is not in English.

HARD RULES (never break):
1. Only campus topics: Wi-Fi, student portal/password, hostel (curfew, maintenance, visitors), fees/refunds, scholarships, admissions verification, academic regulations, OD / on-duty / leave for exams-events.
2. NEVER write code, homework, essays, cheat sheets, or general chat.
3. NEVER invent policies. If CONTEXT is empty/irrelevant/weak, do NOT ANSWER as fact — use CLARIFY or ESCALATE.
4. citationIds must be document ids from CONTEXT only.
5. Short, practical replies. No fluff.
6. Collect missing slots (room/block, student ID+email, CGPA+income) before escalating when needed. Use profile if provided.
7. Escalation must be useful for staff: clear intent, slots, and why a human is needed.
8. Priority: Low = simple info/how-to; Medium = staff action needed soon; High = urgent (exam/OD conflict, lost access, safety, refund pressure).

Respond in this exact JSON shape (no markdown fences):
{"action":"ANSWER"|"CLARIFY"|"ESCALATE"|"REFUSAL","reply":"string","priority":"Low"|"Medium"|"High","intent":"WIFI_ISSUE"|"PASSWORD_RESET"|"MAINTENANCE_REQUEST"|"CURFEW_INQUIRY"|"FEE_REFUND"|"SCHOLARSHIP_INQUIRY"|"ADMISSIONS"|"OD_LEAVE"|"GENERAL_ACADEMIC"|"OFF_TOPIC"|"PROFANITY_ABUSE","slots":{},"citationIds":["documentId",...],"rationale":"one short sentence why this action","handoffNeed":"what staff should do if ESCALATE, else empty"}`;

const RULE_REFUSAL_PATTERNS = [
  /\b(write|solve|do)\b.*\b(homework|assignment|code|program|essay)\b/i,
  /\bcheat\b.*\b(exam|test|quiz)\b/i,
  /\b(javascript|python|java|c\+\+|leetcode)\b/i,
  /\b(buy|sell)\b.*\b(weed|drugs|alcohol|beer)\b/i,
];

const PROFANITY = /\b(fuck|shit|bitch|asshole|bastard)\b/i;

export function ruleSafety(text) {
  if (PROFANITY.test(text)) {
    return {
      action: 'REFUSAL',
      reply: 'Abuse and vulgar language are not allowed on campus channels. Please rephrase your campus help request respectfully. / कृपया गाली-गलौज के बिना अपनी समस्या लिखें।',
      intent: 'PROFANITY_ABUSE',
      priority: 'High',
      slots: {},
      citationIds: [],
    };
  }
  if (RULE_REFUSAL_PATTERNS.some((re) => re.test(text))) {
    return {
      action: 'REFUSAL',
      reply: 'I only handle official campus help (Wi-Fi, portal, hostel, fees, scholarships, admissions, OD/academics). I cannot write code or complete coursework. Tell me your campus issue and I will help.',
      intent: 'OFF_TOPIC',
      priority: 'Low',
      slots: {},
      citationIds: [],
    };
  }
  return null;
}

export function buildMessages({ query, contextBlocks, profile, history }) {
  const profileLine = profile
    ? `Student profile: regNo=${profile.regNo}, name=${profile.name}, hostel=${profile.hostel}, room=${profile.room}, email=${profile.email}, cgpa=${profile.cgpa}`
    : 'Student profile: not logged in';

  const context = contextBlocks.length
    ? contextBlocks.map((c, i) => `[#${i + 1}] id=${c.documentId} title=${c.title} category=${c.category} Source=${c.source}\n${c.content}`).join('\n\n')
    : '(No matching campus documents retrieved. Do not invent policy. Prefer CLARIFY or ESCALATE.)';

  const hist = (history || []).slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n');

  return [
    { role: 'system', content: CAMPUS_SYSTEM },
    {
      role: 'user',
      content: `${profileLine}\n\nCONTEXT:\n${context}\n\nRECENT CHAT:\n${hist || '(none)'}\n\nSTUDENT MESSAGE (reply in their language):\n${query}`,
    },
  ];
}

export function assertFreeModel(model) {
  const m = String(model || '');
  if (!m.includes(':free')) {
    throw new Error(`Only OpenRouter free models are allowed (id must contain ":free"). Got: ${m}`);
  }
  return m;
}

export async function callOpenRouter({ messages, apiKey, model, siteUrl, appName, fallbackModels = [] }) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const candidates = [model, ...fallbackModels]
    .filter(Boolean)
    .map((m) => assertFreeModel(m))
    .filter((m, i, arr) => arr.indexOf(m) === i);

  let lastErr = null;
  for (const candidate of candidates) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': siteUrl || 'http://localhost:5173',
        'X-Title': appName || 'CampusTriage',
      },
      body: JSON.stringify({
        model: candidate,
        messages,
        temperature: 0.25,
        max_tokens: 900,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (String(content).trim()) return content;
      lastErr = new Error(`OpenRouter empty completion from ${candidate}`);
      continue;
    }

    const body = await res.text();
    lastErr = new Error(`OpenRouter ${res.status}: ${body.slice(0, 400)}`);
    // Rotate on rate-limit, missing model, or transient upstream errors
    if (![404, 429, 502, 503].includes(res.status)) break;
  }

  throw lastErr || new Error('OpenRouter request failed');
}

export function parseAgentJson(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    if (text.length > 8) {
      return {
        action: 'CLARIFY',
        reply: text,
        priority: 'Medium',
        intent: 'GENERAL_ACADEMIC',
        slots: {},
        citationIds: [],
        rationale: 'Unstructured model output — showing raw helpful text',
        handoffNeed: '',
      };
    }
    return {
      action: 'CLARIFY',
      reply: 'I could not read the model reply clearly. Please rephrase your campus question (English or Hindi/Hinglish both work). / कृपया अपनी कैंपस समस्या दोबारा लिखें।',
      priority: 'Low',
      intent: 'GENERAL_ACADEMIC',
      slots: {},
      citationIds: [],
      rationale: 'Empty model output',
      handoffNeed: '',
    };
  }
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    const action = ['ANSWER', 'CLARIFY', 'ESCALATE', 'REFUSAL'].includes(parsed.action) ? parsed.action : 'ANSWER';
    const reply = String(parsed.reply || '').trim()
      || text.slice(0, 500)
      || 'Please share a bit more detail about your campus issue.';
    return {
      action,
      reply,
      priority: ['Low', 'Medium', 'High'].includes(parsed.priority) ? parsed.priority : 'Medium',
      intent: parsed.intent || 'GENERAL_ACADEMIC',
      slots: parsed.slots && typeof parsed.slots === 'object' ? parsed.slots : {},
      citationIds: Array.isArray(parsed.citationIds) ? parsed.citationIds.map(String) : [],
      rationale: String(parsed.rationale || ''),
      handoffNeed: String(parsed.handoffNeed || ''),
    };
  } catch {
    return {
      action: 'CLARIFY',
      reply: text.slice(0, 800) || 'Please rephrase your campus question.',
      priority: 'Medium',
      intent: 'GENERAL_ACADEMIC',
      slots: {},
      citationIds: [],
    };
  }
}

export function filterCitations(citationIds, retrieved) {
  const ids = new Set((citationIds || []).map(String));
  if (!ids.size) return [];
  return retrieved
    .filter((r) => ids.has(String(r.documentId)) || ids.has(String(r.chunkId)))
    .filter((r, i, arr) => arr.findIndex((x) => x.documentId === r.documentId) === i)
    .slice(0, 3);
}

export function departmentForIntent(intent) {
  switch (intent) {
    case 'WIFI_ISSUE':
    case 'PASSWORD_RESET':
      return 'IT Support Services';
    case 'CURFEW_INQUIRY':
    case 'MAINTENANCE_REQUEST':
      return 'Hostel Warden & Facilities';
    case 'FEE_REFUND':
    case 'SCHOLARSHIP_INQUIRY':
      return 'Finance & Accounts';
    case 'ADMISSIONS':
    case 'OD_LEAVE':
      return 'Admissions & Registrar';
    default:
      return 'General Academic Support';
  }
}

export function slaForPriority(priority) {
  return slaMeta(priority).slaMs;
}
