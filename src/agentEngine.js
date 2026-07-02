import { campusDocuments } from './knowledgeBase';

const NEGATIVE_KEYWORDS = [
  'broken', 'not working', 'angry', 'failed', 'frustrated', 'bad', 'slow', 
  'stole', 'worst', 'delay', 'urgent', 'asap', 'error', 'useless', 'terrible',
  'annoyed', 'disappointed', 'complaint', 'leak', 'faulty', 'damage', 'fix',
  'terrible', 'pathetic', 'horrible', 'waste', 'hate'
];

const POSITIVE_KEYWORDS = [
  'thank', 'thanks', 'good', 'great', 'awesome', 'helpful', 'perfect', 
  'solved', 'resolved', 'appreciate', 'happy', 'cool', 'excellent'
];

const PROFANITY_LIST = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'crap', 'stupid', 'idiot', 
  'vulgar', 'nonsense', 'fool', 'ass'
];

export function analyzeSentiment(text) {
  const lowerText = text.toLowerCase();
  let score = 0;
  NEGATIVE_KEYWORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) score -= matches.length;
  });
  POSITIVE_KEYWORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) score += matches.length;
  });
  if (score < 0) return { label: 'Frustrated', score, color: 'text-rose-500' };
  if (score > 0) return { label: 'Positive', score, color: 'text-emerald-500' };
  return { label: 'Neutral', score, color: 'text-zinc-400' };
}

export function classifyIntent(text, settings = {}) {
  const lowerText = text.toLowerCase();
  if (settings.profanityFilter !== false) {
    const hasProfanity = PROFANITY_LIST.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerText);
    });
    if (hasProfanity) return 'PROFANITY_ABUSE';
  }
  const isOffTopic = 
    (lowerText.includes('homework') && (lowerText.includes('write') || lowerText.includes('do') || lowerText.includes('solve') || lowerText.includes('complete'))) ||
    (lowerText.includes('assignment') && (lowerText.includes('write') || lowerText.includes('do') || lowerText.includes('solve') || lowerText.includes('complete'))) ||
    lowerText.includes('cheap alcohol') || lowerText.includes('buy beer') || lowerText.includes('drugs') ||
    lowerText.includes('hack') || 
    (lowerText.includes('cheat') && (lowerText.includes('exam') || lowerText.includes('test') || lowerText.includes('quiz'))) ||
    lowerText.includes('bypass') || lowerText.includes('buy weed');
  if (isOffTopic) return 'OFF_TOPIC';
  if (lowerText.includes('wifi') || lowerText.includes('wi-fi') || lowerText.includes('internet') || lowerText.includes('mac address')) return 'WIFI_ISSUE';
  if (lowerText.includes('password') || lowerText.includes('login') || lowerText.includes('otp') || lowerText.includes('sign in')) return 'PASSWORD_RESET';
  if (lowerText.includes('curfew') || lowerText.includes('gate') || lowerText.includes('timing') || lowerText.includes('late entry') || lowerText.includes('biometric')) return 'CURFEW_INQUIRY';
  if (lowerText.includes('maintenance') || lowerText.includes('leak') || lowerText.includes('plumbing') || lowerText.includes('electrical') || lowerText.includes('broken') || lowerText.includes('repair') || lowerText.includes('light') || lowerText.includes('fan') || lowerText.includes('tap') || lowerText.includes('warden')) return 'MAINTENANCE_REQUEST';
  if (lowerText.includes('refund') || lowerText.includes('withdraw program') || lowerText.includes('cancel admission') || lowerText.includes('return money')) return 'FEE_REFUND';
  if (lowerText.includes('scholarship') || lowerText.includes('merit') || lowerText.includes('financial aid') || lowerText.includes('tuition waiver')) return 'SCHOLARSHIP_INQUIRY';
  if (lowerText.includes('admission') || lowerText.includes('document') || lowerText.includes('verification') || lowerText.includes('certificate')) return 'ADMISSIONS';
  return 'GENERAL_ACADEMIC';
}

export function retrieveDocuments(query, customDocumentsList = null) {
  const docsToSearch = customDocumentsList || campusDocuments;
  const queryTokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  if (queryTokens.length === 0) return [];
  const results = docsToSearch.map(doc => {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    queryTokens.forEach(token => {
      if (doc.tags.includes(token)) score += 2.0;
      if (titleLower.includes(token)) score += 1.0;
      if (contentLower.includes(token)) score += 0.3;
    });
    const titleTokens = titleLower.split(/\W+/).filter(Boolean);
    const combinedDocTokens = new Set([...doc.tags, ...titleTokens]);
    let intersection = 0;
    queryTokens.forEach(token => { if (combinedDocTokens.has(token)) intersection++; });
    const jaccard = intersection / (queryTokens.length + combinedDocTokens.size - intersection);
    score += jaccard * 3.0;
    return { doc, score: parseFloat(score.toFixed(3)) };
  });
  return results.filter(r => r.score > 0.15).sort((a, b) => b.score - a.score);
}

export function extractSlots(text, intent, currentSlots = {}) {
  const lowerText = text.toLowerCase();
  const updatedSlots = { ...currentSlots };
  if (intent === 'MAINTENANCE_REQUEST') {
    const roomRegex = /\b(?:room|rm|no\.?|suite)?\s*([1-5]\d{2})\b/;
    const roomMatch = lowerText.match(roomRegex);
    if (roomMatch) updatedSlots.roomNumber = roomMatch[1];
    const blockRegex = /\b(?:block|hostel)\s*([a-fA-F0-9])\b/;
    const blockMatch = lowerText.match(blockRegex);
    if (blockMatch) updatedSlots.blockName = `Block ${blockMatch[1].toUpperCase()}`;
    else if (lowerText.includes('block a') || lowerText.includes('block-a')) updatedSlots.blockName = 'Block A';
    else if (lowerText.includes('block b') || lowerText.includes('block-b')) updatedSlots.blockName = 'Block B';
    else if (lowerText.includes('block c') || lowerText.includes('block-c')) updatedSlots.blockName = 'Block C';
    else if (lowerText.includes('block 1') || lowerText.includes('block-1')) updatedSlots.blockName = 'Block 1';
    else if (lowerText.includes('block 2') || lowerText.includes('block-2')) updatedSlots.blockName = 'Block 2';
    else if (lowerText.includes('block 3') || lowerText.includes('block-3')) updatedSlots.blockName = 'Block 3';
    if (!updatedSlots.issueDescription) updatedSlots.issueDescription = text;
  }
  if (intent === 'PASSWORD_RESET') {
    const idRegex = /\b(\d{2}[a-z]{3}\d{4})\b/i;
    const idMatch = lowerText.match(idRegex);
    if (idMatch) updatedSlots.studentID = idMatch[1].toUpperCase();
    const emailRegex = /\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i;
    const emailMatch = lowerText.match(emailRegex);
    if (emailMatch) updatedSlots.registeredEmail = emailMatch[1].toLowerCase();
  }
  if (intent === 'SCHOLARSHIP_INQUIRY') {
    const cgpaRegex = /\b(?:cgpa|gpa|grade)?\s*([5-9]\.\d{1,2}|10(?:\.0)?)\b/;
    const cgpaMatch = lowerText.match(cgpaRegex);
    if (cgpaMatch) updatedSlots.cgpa = parseFloat(cgpaMatch[1]);
    const incomeRegex = /\b(?:income|earn|family|annual)?\s*([1-9]\.?\d{0,2})\s*(?:lakh|l|lpa|lakhs)\b/i;
    const incomeMatch = lowerText.match(incomeRegex);
    if (incomeMatch) updatedSlots.familyIncome = parseFloat(incomeMatch[1]);
    else {
      const numRegex = /\b([1-9]\d{4,6})\b/;
      const numMatch = lowerText.match(numRegex);
      if (numMatch) updatedSlots.familyIncome = parseFloat(numMatch[1]) / 100000;
    }
  }
  return updatedSlots;
}

export function getDepartmentForIntent(intent) {
  switch (intent) {
    case 'WIFI_ISSUE': case 'PASSWORD_RESET': return 'IT Support Services';
    case 'CURFEW_INQUIRY': case 'MAINTENANCE_REQUEST': return 'Hostel Warden & Facilities';
    case 'FEE_REFUND': case 'SCHOLARSHIP_INQUIRY': return 'Finance & Accounts';
    case 'ADMISSIONS': return 'Admissions & Registrar';
    default: return 'General Academic Support';
  }
}

function runGatekeeper(query, config) {
  const intent = classifyIntent(query, config);
  return {
    agent: 'gatekeeper',
    status: 'complete',
    output: { intent },
    details: intent === 'PROFANITY_ABUSE' ? 'Profanity detected — blocked' :
             intent === 'OFF_TOPIC' ? 'Off-topic query — refused' :
             'Passed all guardrails'
  };
}

function runTriage(query, intent) {
  const sentiment = analyzeSentiment(query);
  return {
    agent: 'triage',
    status: 'complete',
    output: { intent, sentiment },
    details: `Intent: ${intent} | Sentiment: ${sentiment.label} (score: ${sentiment.score})`
  };
}

async function runRetriever(query, docs, config, semanticSearcher) {
  const trace = { keywordMatches: [], semanticMatches: [], topScore: 0, method: 'keyword' };

  const keywordResults = retrieveDocuments(query, docs);
  trace.keywordMatches = keywordResults.map(r => ({ title: r.doc.title, score: r.score }));

  if (semanticSearcher && semanticSearcher.ready && semanticSearcher.index.length > 0) {
    try {
      const semanticResults = await semanticSearcher.search(query, 5);
      trace.semanticMatches = semanticResults.map(r => ({ title: r.title, score: r.score }));
      if (semanticResults.length > 0) {
        trace.method = 'hybrid';
        const mapped = semanticResults.filter(r => r.score > (config.ragThreshold || 0.4));
        if (mapped.length > 0) {
          trace.topScore = mapped[0].score;
          return {
            agent: 'retriever',
            status: 'complete',
            output: { matches: mapped, method: 'hybrid' },
            details: `Semantic search found ${mapped.length} matches (top: ${mapped[0].score.toFixed(3)})`,
            trace
          };
        }
      }
    } catch (e) {
      trace.semanticError = e.message;
    }
  }

  if (keywordResults.length > 0) {
    trace.topScore = keywordResults[0].score;
    const mapped = keywordResults.map(r => ({
      id: r.doc.id, title: r.doc.title, content: r.doc.content, category: r.doc.category,
      tags: r.doc.tags, source: r.doc.source, lastUpdated: r.doc.lastUpdated,
      score: r.score, semanticScore: 0, sparseScore: r.score
    }));
    return {
      agent: 'retriever',
      status: 'complete',
      output: { matches: mapped, method: 'keyword' },
      details: `Keyword search found ${mapped.length} matches (top: ${mapped[0].score.toFixed(3)})`,
      trace
    };
  }

  return {
    agent: 'retriever',
    status: 'no_match',
    output: { matches: [], method: 'none' },
    details: 'No matching documents found',
    trace
  };
}

function runSlotFiller(query, intent, currentSlotState) {
  const slots = extractSlots(query, intent, currentSlotState.slots || {});
  return {
    agent: 'slot_filler',
    status: 'complete',
    output: { slots, activeIntent: intent },
    details: Object.keys(slots).length > 0 ? `Collected: ${Object.entries(slots).map(([k, v]) => `${k}=${v}`).join(', ')}` : 'No new slots'
  };
}

function runPolicyValidator(intent, slots) {
  if (intent !== 'SCHOLARSHIP_INQUIRY') {
    return { agent: 'policy', status: 'skipped', output: { valid: true }, details: 'No policy check needed' };
  }
  if (slots.cgpa === undefined || slots.familyIncome === undefined) {
    return { agent: 'policy', status: 'incomplete', output: { valid: null }, details: 'Missing CGPA or income data' };
  }
  const cgpaOk = slots.cgpa >= 8.0;
  const incomeOk = slots.familyIncome < 4.5;
  const valid = cgpaOk && incomeOk;
  return {
    agent: 'policy',
    status: valid ? 'pass' : 'fail',
    output: { valid, reasons: valid ? [] : [
      !cgpaOk && `CGPA ${slots.cgpa} < 8.0`,
      !incomeOk && `Income ₹${slots.familyIncome}L ≥ ₹4.5L`
    ].filter(Boolean) },
    details: valid ? 'All policy checks passed' : `Failed: ${!cgpaOk ? 'CGPA too low' : ''} ${!incomeOk ? 'Income too high' : ''}`
  };
}

function runEscalation(query, intent, slots, sentiment, config) {
  const dept = getDepartmentForIntent(intent);
  const ticketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
  const priority = (sentiment.label === 'Frustrated' && config.sentimentBoost) ? 'High' : 
                   intent === 'FEE_REFUND' ? 'High' : 'Medium';
  const slaDuration = priority === 'High' ? 1800000 : priority === 'Medium' ? 7200000 : 14400000;

  return {
    agent: 'escalation',
    status: 'complete',
    output: {
      ticket: {
        id: ticketId,
        studentQuery: query,
        intent: intent === 'MAINTENANCE_REQUEST' ? 'Hostel Maintenance Request' :
                intent === 'PASSWORD_RESET' ? 'Student Portal Password Reset' :
                intent === 'SCHOLARSHIP_INQUIRY' ? 'Scholarship Application Handoff' :
                `${intent.replace(/_/g, ' ')}`,
        department: dept,
        priority,
        sentiment: sentiment.label,
        slots,
        timestamp: new Date().toLocaleString(),
        escalatedAt: Date.now(),
        slaDuration
      }
    },
    details: `Ticket ${ticketId} → ${dept} (${priority} priority)`
  };
}

function buildResponse(agentResults, query, sentiment, slots, config) {
  const gatekeeperResult = agentResults.find(r => r.agent === 'gatekeeper');
  const triageResult = agentResults.find(r => r.agent === 'triage');
  const retrieverResult = agentResults.find(r => r.agent === 'retriever');
  const slotResult = agentResults.find(r => r.agent === 'slot_filler');
  const policyResult = agentResults.find(r => r.agent === 'policy');
  const escalationResult = agentResults.find(r => r.agent === 'escalation');

  const intent = gatekeeperResult?.output?.intent || triageResult?.output?.intent;

  if (intent === 'PROFANITY_ABUSE') {
    return {
      reply: "Abuse and vulgar language are strictly prohibited by campus guidelines. Your query has been blocked, and your student session has been flagged for administrative review.",
      action: 'REFUSAL',
      agentTrace: agentResults,
      trace: { query, intent, sentiment, retrievedDocs: [], refusalTriggered: true, escalationTriggered: false, slotsCollected: slots, timestamp: new Date().toLocaleTimeString(), config }
    };
  }

  if (intent === 'OFF_TOPIC') {
    return {
      reply: "I am programmed to assist only with official campus policies, IT setups, hostel guidelines, academic rules, and administrative fees. I cannot write homework, assist with exam cheats, or answer off-topic queries. Let me know if you have a campus-related question!",
      action: 'REFUSAL',
      agentTrace: agentResults,
      trace: { query, intent, sentiment, retrievedDocs: [], refusalTriggered: true, escalationTriggered: false, slotsCollected: slots, timestamp: new Date().toLocaleTimeString(), config }
    };
  }

  const matches = retrieverResult?.output?.matches || [];
  const currentSlots = slotResult?.output?.slots || {};

  if (intent === 'MAINTENANCE_REQUEST') {
    if (!currentSlots.blockName && !currentSlots.roomNumber) {
      return {
        reply: "I can help escalate your hostel maintenance request. Could you please specify your Hostel Block (e.g., Block A, Block 3) and Room Number?",
        action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'MAINTENANCE_REQUEST', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config }
      };
    } else if (!currentSlots.blockName) {
      return { reply: `Thanks for providing Room ${currentSlots.roomNumber}. Which Hostel Block is this in?`, action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'MAINTENANCE_REQUEST', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config } };
    } else if (!currentSlots.roomNumber) {
      return { reply: `Got it, ${currentSlots.blockName}. What is your Room Number?`, action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'MAINTENANCE_REQUEST', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config } };
    }
    const escalation = runEscalation(query, intent, currentSlots, sentiment, config);
    const tkt = escalation.output.ticket;
    return {
      reply: `Your hostel maintenance request has been successfully filed under Ticket #${tkt.id}. I've routed this directly to the ${tkt.department} department. A technician will visit Room ${currentSlots.roomNumber} in ${currentSlots.blockName} within 24 hours.`,
      action: 'ESCALATE', agentTrace: [...agentResults, escalation], newSlots: {}, 
      trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: true, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config },
      ticket: tkt
    };
  }

  if (intent === 'PASSWORD_RESET') {
    if (!currentSlots.studentID && !currentSlots.registeredEmail) {
      return { reply: "To log a portal password reset ticket, could you please provide your 9-digit Student Registration ID (e.g., 22BCE1002) and registered email address?", action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'PASSWORD_RESET', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config } };
    } else if (!currentSlots.studentID) {
      return { reply: `Thanks for the email: ${currentSlots.registeredEmail}. Please provide your 9-digit Student Registration ID.`, action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'PASSWORD_RESET', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config } };
    } else if (!currentSlots.registeredEmail) {
      return { reply: `Got Student ID ${currentSlots.studentID}. What is your registered email?`, action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'PASSWORD_RESET', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config } };
    }
    const escalation = runEscalation(query, intent, currentSlots, sentiment, config);
    const tkt = escalation.output.ticket;
    return {
      reply: `Credential details matched. I have created IT Support Ticket #${tkt.id} and escalated this to the ${tkt.department}. Your reset instructions will be sent to ${currentSlots.registeredEmail} shortly.`,
      action: 'ESCALATE', agentTrace: [...agentResults, escalation], newSlots: {},
      trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: true, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config },
      ticket: tkt
    };
  }

  if (intent === 'SCHOLARSHIP_INQUIRY') {
    if (currentSlots.cgpa === undefined && currentSlots.familyIncome === undefined) {
      return { reply: "To verify your eligibility for the Merit-cum-Means scholarship, could you tell me your current CGPA and your family's annual income in Lakhs?", action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'SCHOLARSHIP_INQUIRY', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config } };
    } else if (currentSlots.cgpa === undefined) {
      return { reply: `Received income ₹${currentSlots.familyIncome}L. What is your current CGPA?`, action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'SCHOLARSHIP_INQUIRY', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config } };
    } else if (currentSlots.familyIncome === undefined) {
      return { reply: `Got CGPA ${currentSlots.cgpa}. What is your family's annual income in Lakhs?`, action: 'CLARIFY', agentTrace: agentResults, newSlots: { activeIntent: 'SCHOLARSHIP_INQUIRY', slots: currentSlots },
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config } };
    }
    const qualifiesCGPA = currentSlots.cgpa >= 8.0;
    const qualifiesIncome = currentSlots.familyIncome < 4.5;
    if (qualifiesCGPA && qualifiesIncome) {
      const escalation = runEscalation(query, intent, currentSlots, sentiment, config);
      const tkt = escalation.output.ticket;
      return {
        reply: `Congratulations! Based on your parameters (CGPA: ${currentSlots.cgpa}, Income: ₹${currentSlots.familyIncome}L), you meet the eligibility. Ticket #${tkt.id} filed with ${tkt.department}.`,
        action: 'ESCALATE', agentTrace: [...agentResults, escalation], newSlots: {},
        trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: true, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config },
        ticket: tkt
      };
    }
    const failureReason = !qualifiesCGPA && !qualifiesIncome
      ? `Your CGPA ${currentSlots.cgpa} is below 8.0 AND your income ₹${currentSlots.familyIncome}L is above the ₹4.5L limit.`
      : !qualifiesCGPA ? `Your CGPA ${currentSlots.cgpa} is below the required 8.0.`
      : `Your income ₹${currentSlots.familyIncome}L is above the ₹4.5L limit.`;
    return {
      reply: `Based on official guidelines, you do not meet the minimum requirements. Reason: ${failureReason}`,
      action: 'REFUSAL', agentTrace: agentResults, newSlots: {},
      trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: true, escalationTriggered: false, slotsCollected: currentSlots, timestamp: new Date().toLocaleTimeString(), config }
    };
  }

  const ragThreshold = config.ragThreshold || 0.40;
  if (matches.length > 0 && matches[0].score >= ragThreshold && intent !== 'FEE_REFUND') {
    const best = matches[0];
    return {
      reply: `${best.content}\n\n[Source: ${best.source}]`,
      action: 'ANSWER',
      agentTrace: agentResults,
      trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: false, slotsCollected: slots, timestamp: new Date().toLocaleTimeString(), config }
    };
  }

  const escalation = runEscalation(query, intent, slots, sentiment, config);
  const tkt = escalation.output.ticket;
  return {
    reply: `I cannot find a direct answer in our knowledge base. Support ticket #${tkt.id} created and routed to ${tkt.department}.`,
    action: 'ESCALATE',
    agentTrace: [...agentResults, escalation],
    newSlots: {},
    trace: { query, intent, sentiment, retrievedDocs: matches, refusalTriggered: false, escalationTriggered: true, slotsCollected: slots, timestamp: new Date().toLocaleTimeString(), config },
    ticket: tkt
  };
}

export async function processQueryAsync(query, chatHistory = [], slotState = {}, settings = {}, customDocumentsList = null, semanticSearcher = null, graphContext = null) {
  const config = {
    ragThreshold: settings.ragThreshold !== undefined ? Number(settings.ragThreshold) : 0.40,
    sentimentBoost: settings.sentimentBoost !== false,
    profanityFilter: settings.profanityFilter !== false
  };

  const agentResults = [];

  const gatekeeperResult = runGatekeeper(query, config);
  agentResults.push(gatekeeperResult);
  const intent = gatekeeperResult.output.intent;
  if (intent === 'PROFANITY_ABUSE' || intent === 'OFF_TOPIC') {
    const sentiment = analyzeSentiment(query);
    return buildResponse(agentResults, query, sentiment, {}, config);
  }

  const triageResult = runTriage(query, intent);
  agentResults.push(triageResult);
  const sentiment = triageResult.output.sentiment;
  const docs = customDocumentsList || campusDocuments;

  const retrieverResult = await runRetriever(query, docs, config, semanticSearcher);
  agentResults.push(retrieverResult);

  const slotResult = runSlotFiller(query, intent, slotState);
  agentResults.push(slotResult);
  const slots = slotResult.output.slots;

  const policyResult = runPolicyValidator(intent, slots);
  agentResults.push(policyResult);

  return buildResponse(agentResults, query, sentiment, slots, config);
}

export function processQuery(query, chatHistory = [], slotState = {}, settings = {}, customDocumentsList = null) {
  const config = {
    ragThreshold: settings.ragThreshold !== undefined ? Number(settings.ragThreshold) : 0.40,
    sentimentBoost: settings.sentimentBoost !== false,
    profanityFilter: settings.profanityFilter !== false
  };

  const intent = slotState.activeIntent || classifyIntent(query, config);
  const sentiment = analyzeSentiment(query);
  const trace = {
    query, intent, sentiment,
    retrievedDocs: [],
    refusalTriggered: false,
    escalationTriggered: false,
    slotsCollected: slotState.slots ? { ...slotState.slots } : {},
    timestamp: new Date().toLocaleTimeString(),
    config
  };

  if (intent === 'PROFANITY_ABUSE') {
    trace.refusalTriggered = true;
    return { reply: "Abuse and vulgar language are strictly prohibited by campus guidelines. Your query has been blocked, and your student session has been flagged for administrative review.", trace, newSlots: {}, action: 'REFUSAL' };
  }
  if (intent === 'OFF_TOPIC') {
    trace.refusalTriggered = true;
    return { reply: "I am programmed to assist only with official campus policies, IT setups, hostel guidelines, academic rules, and administrative fees. I cannot write homework, assist with exam cheats, or answer off-topic queries. Let me know if you have a campus-related question!", trace, newSlots: {}, action: 'REFUSAL' };
  }

  const docs = customDocumentsList || campusDocuments;
  const matches = retrieveDocuments(query, docs);
  trace.retrievedDocs = matches;

  if (intent === 'MAINTENANCE_REQUEST') {
    const currentSlots = extractSlots(query, 'MAINTENANCE_REQUEST', slotState.slots || {});
    const activeSlots = { activeIntent: 'MAINTENANCE_REQUEST', slots: currentSlots };
    trace.slotsCollected = currentSlots;
    if (!currentSlots.blockName && !currentSlots.roomNumber) {
      return { reply: "I can help escalate your hostel maintenance request. Could you please specify your Hostel Block (e.g., Block A, Block 3) and Room Number?", trace, newSlots: activeSlots, action: 'CLARIFY' };
    } else if (!currentSlots.blockName) {
      return { reply: `Thanks for providing Room ${currentSlots.roomNumber}. Which Hostel Block is this in?`, trace, newSlots: activeSlots, action: 'CLARIFY' };
    } else if (!currentSlots.roomNumber) {
      return { reply: `Got it, ${currentSlots.blockName}. What is your Room Number?`, trace, newSlots: activeSlots, action: 'CLARIFY' };
    }
    trace.escalationTriggered = true;
    const dept = getDepartmentForIntent('MAINTENANCE_REQUEST');
    const ticketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
    const priority = (sentiment.label === 'Frustrated' && config.sentimentBoost) ? 'High' : 'Medium';
    return { reply: `Your request has been filed under Ticket #${ticketId}. routed to ${dept}. A technician will visit Room ${currentSlots.roomNumber} in ${currentSlots.blockName} within 24 hours.`, trace, newSlots: {}, action: 'ESCALATE',
      ticket: { id: ticketId, studentQuery: currentSlots.issueDescription || query, intent: 'Hostel Maintenance Request', department: dept, priority, sentiment: sentiment.label, slots: currentSlots, timestamp: new Date().toLocaleString() } };
  }

  if (intent === 'PASSWORD_RESET') {
    const currentSlots = extractSlots(query, 'PASSWORD_RESET', slotState.slots || {});
    const activeSlots = { activeIntent: 'PASSWORD_RESET', slots: currentSlots };
    trace.slotsCollected = currentSlots;
    if (!currentSlots.studentID && !currentSlots.registeredEmail) {
      return { reply: "Please provide your 9-digit Student Registration ID (e.g., 22BCE1002) and registered email?", trace, newSlots: activeSlots, action: 'CLARIFY' };
    } else if (!currentSlots.studentID) {
      return { reply: `Thanks for email ${currentSlots.registeredEmail}. What is your Student Registration ID?`, trace, newSlots: activeSlots, action: 'CLARIFY' };
    } else if (!currentSlots.registeredEmail) {
      return { reply: `Got ID ${currentSlots.studentID}. What is your registered email?`, trace, newSlots: activeSlots, action: 'CLARIFY' };
    }
    trace.escalationTriggered = true;
    const dept = getDepartmentForIntent('PASSWORD_RESET');
    const ticketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
    const priority = (sentiment.label === 'Frustrated' && config.sentimentBoost) ? 'High' : 'Medium';
    return { reply: `IT Ticket #${ticketId} created. Reset instructions sent to ${currentSlots.registeredEmail}.`, trace, newSlots: {}, action: 'ESCALATE',
      ticket: { id: ticketId, studentQuery: `Password reset for ${currentSlots.studentID}`, intent: 'Student Portal Password Reset', department: dept, priority, sentiment: sentiment.label, slots: currentSlots, timestamp: new Date().toLocaleString() } };
  }

  if (intent === 'SCHOLARSHIP_INQUIRY') {
    const currentSlots = extractSlots(query, 'SCHOLARSHIP_INQUIRY', slotState.slots || {});
    const activeSlots = { activeIntent: 'SCHOLARSHIP_INQUIRY', slots: currentSlots };
    trace.slotsCollected = currentSlots;
    if (currentSlots.cgpa === undefined && currentSlots.familyIncome === undefined) {
      return { reply: "To check eligibility, what is your CGPA and family's annual income in Lakhs?", trace, newSlots: activeSlots, action: 'CLARIFY' };
    } else if (currentSlots.cgpa === undefined) {
      return { reply: `Income ₹${currentSlots.familyIncome}L noted. What is your CGPA?`, trace, newSlots: activeSlots, action: 'CLARIFY' };
    } else if (currentSlots.familyIncome === undefined) {
      return { reply: `CGPA ${currentSlots.cgpa} noted. What is your family's annual income in Lakhs?`, trace, newSlots: activeSlots, action: 'CLARIFY' };
    }
    const qualifiesCGPA = currentSlots.cgpa >= 8.0;
    const qualifiesIncome = currentSlots.familyIncome < 4.5;
    if (qualifiesCGPA && qualifiesIncome) {
      trace.escalationTriggered = true;
      const dept = getDepartmentForIntent('SCHOLARSHIP_INQUIRY');
      const ticketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
      const priority = (sentiment.label === 'Frustrated' && config.sentimentBoost) ? 'High' : 'Medium';
      return { reply: `You meet the eligibility! Ticket #${ticketId} filed with ${dept}.`, trace, newSlots: {}, action: 'ESCALATE',
        ticket: { id: ticketId, studentQuery: `Scholarship (CGPA: ${currentSlots.cgpa}, Income: ${currentSlots.familyIncome}L)`, intent: 'Scholarship Application Handoff', department: dept, priority, sentiment: sentiment.label, slots: currentSlots, timestamp: new Date().toLocaleString() } };
    }
    trace.refusalTriggered = true;
    const failureReason = !qualifiesCGPA && !qualifiesIncome
      ? `CGPA ${currentSlots.cgpa} < 8.0 AND income ₹${currentSlots.familyIncome}L > ₹4.5L`
      : !qualifiesCGPA ? `CGPA ${currentSlots.cgpa} < 8.0` : `Income ₹${currentSlots.familyIncome}L > ₹4.5L`;
    return { reply: `Not eligible. ${failureReason}`, trace, newSlots: {}, action: 'REFUSAL' };
  }

  if (matches.length > 0 && intent !== 'FEE_REFUND' && !(sentiment.label === 'Frustrated' && config.sentimentBoost)) {
    const bestMatch = matches[0];
    if (bestMatch.score >= config.ragThreshold) {
      return { reply: `${bestMatch.doc.content}\n\n[Source: ${bestMatch.doc.source}]`, trace, newSlots: {}, action: 'ANSWER' };
    }
  }

  trace.escalationTriggered = true;
  const dept = getDepartmentForIntent(intent);
  const ticketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
  let priority = 'Medium';
  if (intent === 'FEE_REFUND' || (sentiment.label === 'Frustrated' && config.sentimentBoost)) priority = 'High';
  else if (sentiment.label === 'Positive') priority = 'Low';
  return {
    reply: `I cannot find a direct answer. Ticket #${ticketId} created and routed to ${dept}.`,
    trace, newSlots: {}, action: 'ESCALATE',
    ticket: { id: ticketId, studentQuery: query, intent: `${intent.replace('_', ' ')}`, department: dept, priority, sentiment: sentiment.label, slots: {}, timestamp: new Date().toLocaleString() }
  };
}
