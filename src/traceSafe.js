/** Normalize agent traces so Admin Pipeline never crashes on partial API payloads. */
export function normalizeTrace(raw, fallback = {}) {
  const t = raw && typeof raw === 'object' ? raw : {};
  const sentiment = t.sentiment && typeof t.sentiment === 'object'
    ? t.sentiment
    : { label: 'Neutral', score: 0, color: 'text-zinc-500' };
  const config = t.config && typeof t.config === 'object' ? t.config : {};
  return {
    query: t.query || fallback.query || '',
    intent: t.intent || fallback.intent || 'GENERAL_ACADEMIC',
    action: t.action || fallback.action || null,
    priority: t.priority || fallback.priority || 'Medium',
    sentiment: {
      label: sentiment.label || 'Neutral',
      score: typeof sentiment.score === 'number' ? sentiment.score : 0,
      color: sentiment.color || 'text-zinc-500',
    },
    config: {
      ragThreshold: typeof config.ragThreshold === 'number' ? config.ragThreshold : 0.55,
      sentimentBoost: config.sentimentBoost !== false,
      profanityFilter: config.profanityFilter !== false,
    },
    retrievedDocs: Array.isArray(t.retrievedDocs)
      ? t.retrievedDocs
      : Array.isArray(t.docs)
        ? t.docs
        : Array.isArray(fallback.retrievedDocs)
          ? fallback.retrievedDocs
          : [],
    slotsCollected: t.slotsCollected || t.slots || fallback.slots || {},
    refusalTriggered: Boolean(t.refusalTriggered || t.action === 'REFUSAL' || fallback.action === 'REFUSAL'),
    escalationTriggered: Boolean(
      t.escalationTriggered
      || t.action === 'ESCALATE'
      || t.action === 'ESCALATE_PROPOSE'
      || fallback.action === 'ESCALATE'
      || fallback.action === 'ESCALATE_PROPOSE'
    ),
    plan: t.plan || fallback.plan || null,
    etaLabel: t.etaLabel || fallback.etaLabel || null,
    owner: t.owner || fallback.owner || null,
  };
}

export function traceFromApiPlan(api, query) {
  const plan = api?.plan || {};
  const docs = (plan.steps || [])
    .flatMap((s) => s.docs || [])
    .map((d) => ({
      id: d.id,
      title: d.title,
      source: d.source,
      category: d.category,
      score: typeof plan.confidence === 'number' ? plan.confidence : 0.5,
    }));
  return normalizeTrace({
    query,
    intent: api.intent,
    action: api.action,
    priority: api.priority,
    retrievedDocs: docs,
    slotsCollected: api.slots || {},
    plan,
    etaLabel: api.etaLabel || plan.etaLabel,
    owner: api.owner || plan.owner,
    config: { ragThreshold: 0.5, sentimentBoost: true, profanityFilter: true },
    sentiment: { label: 'Neutral', score: 0, color: 'text-zinc-500' },
  });
}
