const AGENT_PROFILES = {
  counselor: {
    name: 'Priya — Student Counselor',
    emoji: '🧑‍💼',
    color: '#7c3aed',
    priority: ['empathy', 'student_wellbeing', 'follow_up'],
    style: 'empathetic',
    responses: {
      frustrated: (query, intent) => `I understand how frustrating this must be. Let me personally ensure your ${intent.toLowerCase().replace(/_/g, ' ')} issue gets the attention it deserves. I'm flagging this as priority.`,
      neutral: (query, intent) => `I'd like to help you with your ${intent.toLowerCase().replace(/_/g, ' ')} request. Let me gather the right information to resolve this quickly.`,
      positive: (query, intent) => `Great to hear from you! I'll make sure your ${intent.toLowerCase().replace(/_/g, ' ')} request is handled promptly.`
    }
  },
  itExpert: {
    name: 'Arjun — IT Specialist',
    emoji: '🧑‍💻',
    color: '#2563eb',
    priority: ['technical_accuracy', 'speed', 'efficiency'],
    style: 'technical',
    responses: {
      frustrated: (query, intent) => `Technical analysis initiated. For ${intent.replace(/_/g, ' ')}: I've identified the fastest resolution path. Routing to Level-2 support with pre-diagnosed context.`,
      neutral: (query, intent) => `Processing ${intent.replace(/_/g, ' ')} request. I'll run a diagnostic check against our knowledge base to find the optimal solution.`,
      positive: (query, intent) => `Good news — your ${intent.replace(/_/g, ' ')} query matches a known resolution pattern. I can resolve this directly.`
    }
  },
  financePolicy: {
    name: 'Meera — Finance & Policy',
    emoji: '👩‍⚖️',
    color: '#059669',
    priority: ['policy_compliance', 'budget_impact', 'documentation'],
    style: 'policy_focused',
    responses: {
      frustrated: (query, intent) => `I understand the urgency. For ${intent.replace(/_/g, ' ')}, I'll ensure all policy requirements are met while expediting the process. No unnecessary delays.`,
      neutral: (query, intent) => `Reviewing ${intent.replace(/_/g, ' ')} against institutional policies. I'll verify eligibility and compliance requirements before proceeding.`,
      positive: (query, intent) => `Thank you! Your ${intent.replace(/_/g, ' ')} request appears to be in good standing. I'll verify policy compliance and process accordingly.`
    }
  }
};

const VOTE_WEIGHTS = {
  counselor: { frustrated: 0.5, neutral: 0.3, positive: 0.2 },
  itExpert: { frustrated: 0.2, neutral: 0.5, positive: 0.4 },
  financePolicy: { frustrated: 0.3, neutral: 0.2, positive: 0.4 }
};

export function runMultiAgentDebate(query, intent, sentiment, slots, config) {
  const sentimentLabel = sentiment.label.toLowerCase();
  const debate = { agents: [], votes: [], finalDecision: null, consensus: 0 };

  const agents = Object.entries(AGENT_PROFILES).map(([key, profile]) => {
    const response = profile.responses[sentimentLabel]?.(query, intent) || profile.responses.neutral(query, intent);
    const weight = VOTE_WEIGHTS[key]?.[sentimentLabel] || 0.33;
    return { key, ...profile, response, weight };
  });

  debate.agents = agents;

  const resolution = intent === 'SCHOLARSHIP_INQUIRY' ? 'financePolicy'
    : intent === 'WIFI_ISSUE' || intent === 'PASSWORD_RESET' ? 'itExpert'
    : sentimentLabel === 'frustrated' ? 'counselor'
    : 'itExpert';

  agents.forEach(agent => {
    const agrees = agent.key === resolution;
    debate.votes.push({
      agent: agent.key,
      name: agent.name,
      emoji: agent.emoji,
      color: agent.color,
      response: agent.response,
      vote: agrees ? 'AGREE' : 'ALTERNATIVE',
      weight: agent.weight
    });
  });

  const winner = agents.find(a => a.key === resolution);
  debate.finalDecision = {
    selectedAgent: winner.name,
    response: winner.response,
    consensus: Math.round((agents.filter(a => a.key === resolution).length / agents.length) * 100)
  };

  return debate;
}

export function predictSLABreach(tickets) {
  if (tickets.length < 2) return [];

  const now = Date.now();
  const predictions = tickets.map(ticket => {
    const elapsed = now - ticket.escalatedAt;
    const remaining = ticket.slaDuration - elapsed;
    const progress = elapsed / ticket.slaDuration;
    const minutesLeft = remaining / 60000;

    const priorityWeight = ticket.priority === 'High' ? 1.5 : ticket.priority === 'Medium' ? 1.0 : 0.7;
    const sentimentWeight = ticket.sentiment === 'Frustrated' ? 1.3 : 1.0;

    const riskScore = Math.min(100, Math.round(
      (progress * 60) +
      (priorityWeight * 15) +
      (sentimentWeight * 10) +
      (Math.random() * 5)
    ));

    const willBreach = remaining < 600000 || riskScore > 70;
    const predictedBreachTime = willBreach ? now + remaining * (1 - riskScore / 100) : null;

    let recommendation = '';
    if (riskScore > 80) recommendation = 'CRITICAL: Assign senior staff immediately';
    else if (riskScore > 60) recommendation = 'WARNING: Escalate to department lead';
    else if (riskScore > 40) recommendation = 'MONITOR: Check progress in 30 minutes';
    else recommendation = 'ON TRACK: Standard resolution path';

    return {
      ticketId: ticket.id,
      intent: ticket.intent,
      department: ticket.department,
      priority: ticket.priority,
      elapsed: Math.round(elapsed / 60000),
      remaining: Math.max(0, Math.round(minutesLeft)),
      riskScore,
      willBreach,
      predictedBreachTime: predictedBreachTime ? new Date(predictedBreachTime).toLocaleTimeString() : null,
      recommendation,
      slaDuration: ticket.slaDuration,
      progress: Math.min(100, Math.round(progress * 100))
    };
  });

  return predictions.sort((a, b) => b.riskScore - a.riskScore);
}

const EMOTION_STYLES = {
  frustrated: {
    prefix: ['I completely understand your frustration.', 'I sincerely apologize for this experience.', 'This is not the standard we aim for.', 'I hear you, and I take this seriously.'],
    tone: 'empathetic',
    closing: ['I will personally follow up on this.', 'You have my commitment this will be resolved.', 'I am escalating this with highest urgency.'],
    urgency: 'HIGH'
  },
  neutral: {
    prefix: ['Thank you for reaching out.', 'I can help you with that.', 'Let me look into this for you.', 'Happy to assist.'],
    tone: 'professional',
    closing: ['Please let me know if you need anything else.', 'I will keep you updated on the progress.', 'Feel free to reach out anytime.'],
    urgency: 'MEDIUM'
  },
  positive: {
    prefix: ['Wonderful!', 'Great to hear from you!', 'That\'s great news!', 'Excellent!'],
    tone: 'enthusiastic',
    closing: ['Don\'t hesitate to reach out if you need more help!', 'We\'re always here for you!', 'Have a wonderful day ahead!'],
    urgency: 'LOW'
  }
};

export function generateEmotionAdaptiveResponse(baseReply, sentiment, intent) {
  const style = EMOTION_STYLES[sentiment.label.toLowerCase()] || EMOTION_STYLES.neutral;
  const prefix = style.prefix[Math.floor(Math.random() * style.prefix.length)];
  const closing = style.closing[Math.floor(Math.random() * style.closing.length)];

  let adaptedResponse = `${prefix}\n\n${baseReply}\n\n${closing}`;

  return {
    response: adaptedResponse,
    tone: style.tone,
    urgency: style.urgency,
    sentimentDetected: sentiment.label,
    emotionScore: sentiment.score
  };
}

export function detectAnomalies(recentTickets, historicalAvg = 2) {
  const deptCounts = {};
  const intentCounts = {};
  const hourlyCounts = {};

  recentTickets.forEach(t => {
    deptCounts[t.department] = (deptCounts[t.department] || 0) + 1;
    intentCounts[t.intent] = (intentCounts[t.intent] || 0) + 1;
    const hour = new Date(t.timestamp || Date.now()).getHours();
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
  });

  const anomalies = [];

  Object.entries(deptCounts).forEach(([dept, count]) => {
    if (count > historicalAvg * 2) {
      anomalies.push({
        type: 'DEPARTMENT_SPIKE',
        severity: count > historicalAvg * 3 ? 'critical' : 'warning',
        message: `${dept} has ${count} tickets (${Math.round(count / historicalAvg)}x normal volume)`,
        department: dept,
        count,
        suggestion: dept.includes('IT') ? 'Possible network outage — check firewall logs'
          : dept.includes('Hostel') ? 'Possible facility issue — dispatch maintenance team'
          : dept.includes('Finance') ? 'Peak billing period — verify payment gateway'
          : 'Review recent policy changes that may have triggered complaints'
      });
    }
  });

  const frustratedCount = recentTickets.filter(t => t.sentiment === 'Frustrated').length;
  if (frustratedCount >= 3) {
    anomalies.push({
      type: 'SENTIMENT_SPIKE',
      severity: frustratedCount >= 5 ? 'critical' : 'warning',
      message: `${frustratedCount} frustrated students detected — possible service disruption`,
      suggestion: 'Check for recent system outages or policy changes affecting student experience'
    });
  }

  const highPriorityCount = recentTickets.filter(t => t.priority === 'High').length;
  if (highPriorityCount >= 3) {
    anomalies.push({
      type: 'PRIORITY_SPIKE',
      severity: 'warning',
      message: `${highPriorityCount} high-priority tickets in queue — SLA breach risk`,
      suggestion: 'Consider redistributing staff or activating overflow support team'
    });
  }

  return anomalies.sort((a, b) => {
    const severityOrder = { critical: 3, warning: 2, info: 1 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });
}

export function smartStaffAssignment(intent, sentiment, priority, department) {
  const staffPool = {
    'IT Support Services': [
      { name: 'Rahul Verma', speciality: 'Network & WiFi', resolutionRate: 94, avgTime: 18, online: true },
      { name: 'Sneha Patel', speciality: 'Account & Portal', resolutionRate: 91, avgTime: 22, online: true },
      { name: 'Vikram Singh', speciality: 'Hardware & Printing', resolutionRate: 88, avgTime: 25, online: false }
    ],
    'Hostel Warden & Facilities': [
      { name: 'Dr. Anand Sharma', speciality: 'Maintenance & Repairs', resolutionRate: 92, avgTime: 35, online: true },
      { name: 'Kavitha Nair', speciality: 'Room Allocation', resolutionRate: 96, avgTime: 15, online: true },
      { name: 'Rajesh Gupta', speciality: 'Security & Access', resolutionRate: 89, avgTime: 30, online: true }
    ],
    'Finance & Accounts': [
      { name: 'CA Priyanka Desai', speciality: 'Scholarships & Aid', resolutionRate: 97, avgTime: 12, online: true },
      { name: 'Amit Joshi', speciality: 'Fee & Refunds', resolutionRate: 93, avgTime: 20, online: true }
    ],
    'General Academic Support': [
      { name: 'Prof. Sunita Rao', speciality: 'Academic Records', resolutionRate: 95, avgTime: 28, online: true },
      { name: 'Dr. Mohammed Khan', speciality: 'Exam & Grading', resolutionRate: 90, avgTime: 32, online: false }
    ]
  };

  const pool = staffPool[department] || staffPool['General Academic Support'];
  const onlineStaff = pool.filter(s => s.online);

  const scored = onlineStaff.map(staff => {
    let score = staff.resolutionRate;
    if (priority === 'High') score += (staff.avgTime < 20 ? 10 : -5);
    if (sentiment === 'Frustrated') score += (staff.resolutionRate > 93 ? 8 : 0);
    return { ...staff, matchScore: Math.min(100, score) };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return {
    recommended: scored[0] || null,
    alternatives: scored.slice(1, 3),
    reasoning: scored[0]
      ? `${scored[0].name} has ${scored[0].resolutionRate}% resolution rate and specializes in ${scored[0].speciality}. Avg resolution: ${scored[0].avgTime}min.`
      : 'No staff currently online. Ticket queued for next available agent.'
  };
}

export function findSimilarTickets(targetTicket, allTickets, maxResults = 3) {
  const targetWords = (targetTicket.studentQuery || '').toLowerCase().split(/\W+/).filter(Boolean);
  const targetIntent = targetTicket.intent;

  const scored = allTickets
    .filter(t => t.id !== targetTicket.id)
    .map(ticket => {
      const ticketWords = (ticket.studentQuery || '').toLowerCase().split(/\W+/).filter(Boolean);
      const intersection = targetWords.filter(w => ticketWords.includes(w));
      const union = new Set([...targetWords, ...ticketWords]);
      const jaccard = intersection.length / union.size;

      const intentMatch = ticket.intent === targetIntent ? 0.3 : 0;
      const totalScore = jaccard + intentMatch;

      return {
        ticket,
        similarity: Math.round(totalScore * 100),
        matchingKeywords: intersection.slice(0, 5),
        resolution: ticket.slaMet !== undefined ? (ticket.slaMet ? 'Resolved (SLA Met)' : 'Resolved (SLA Breached)') : 'Pending'
      };
    })
    .filter(s => s.similarity > 10)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  return scored;
}

export function parseNaturalLanguageQuery(query) {
  const lower = query.toLowerCase();
  const filters = {};

  if (lower.includes('high priority') || lower.includes('urgent') || lower.includes('critical')) {
    filters.priority = 'High';
  } else if (lower.includes('medium priority') || lower.includes('normal')) {
    filters.priority = 'Medium';
  } else if (lower.includes('low priority')) {
    filters.priority = 'Low';
  }

  if (lower.includes('it ') || lower.includes('tech') || lower.includes('wifi') || lower.includes('password')) {
    filters.department = 'IT';
  } else if (lower.includes('hostel') || lower.includes('room') || lower.includes('maintenance')) {
    filters.department = 'Hostel';
  } else if (lower.includes('finance') || lower.includes('fee') || lower.includes('scholarship') || lower.includes('refund')) {
    filters.department = 'Finance';
  } else if (lower.includes('academic') || lower.includes('grade') || lower.includes('exam')) {
    filters.department = 'Academic';
  }

  if (lower.includes('frustrated') || lower.includes('angry') || lower.includes('upset')) {
    filters.sentiment = 'Frustrated';
  } else if (lower.includes('neutral') || lower.includes('calm')) {
    filters.sentiment = 'Neutral';
  }

  if (lower.includes('today')) {
    const today = new Date().toDateString();
    filters.date = today;
  } else if (lower.includes('this week')) {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    filters.dateFrom = weekAgo.toISOString();
  }

  if (lower.includes('resolved') || lower.includes('completed') || lower.includes('done')) {
    filters.status = 'resolved';
  } else if (lower.includes('pending') || lower.includes('open') || lower.includes('active')) {
    filters.status = 'active';
  }

  const hasFilters = Object.keys(filters).length > 0;

  return {
    filters,
    hasFilters,
    interpretedAs: hasFilters
      ? `Filtering: ${Object.entries(filters).map(([k, v]) => `${k}="${v}"`).join(', ')}`
      : 'No specific filters detected. Showing all tickets.'
  };
}
