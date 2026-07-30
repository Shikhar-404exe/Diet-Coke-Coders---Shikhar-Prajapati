import { db } from '../db/index.js';

function tokenize(q) {
  return String(q || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 2);
}

const CATEGORY_HINTS = [
  { re: /(wifi|wi-fi|internet|mac address|network)/i, category: 'IT Support' },
  { re: /(password|portal|otp|login)/i, category: 'IT Support' },
  { re: /(print|printer|quota)/i, category: 'IT Support' },
  { re: /(hostel|curfew|gate pass|warden|visitor|guest|room|maintenance|fan|leak)/i, category: 'Hostel' },
  { re: /(fee|refund|tuition|payment|fine)/i, category: 'Finance' },
  { re: /(scholarship|merit|income certificate)/i, category: 'Finance' },
  { re: /(admission|verification|migration|transfer certificate)/i, category: 'Admissions' },
  { re: /(cgpa|grade|attendance|exam|withdraw|course)/i, category: 'Academics' },
];

export function inferCategory(query) {
  for (const h of CATEGORY_HINTS) {
    if (h.re.test(query)) return h.category;
  }
  return null;
}

/** Retrieve only matching campus chunks — never invent sources. Prefer category match. */
export function retrieveDocuments(query, limit = 5) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const preferredCategory = inferCategory(query);

  let rows = [];
  try {
    const ftsQuery = tokens.map((t) => `"${t.replace(/"/g, '')}"`).join(' OR ');
    rows = db.prepare(`
      SELECT chunk_id, document_id, title, category, content, tags,
             bm25(document_fts) AS rank
      FROM document_fts
      WHERE document_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, limit * 3);
  } catch {
    rows = [];
  }

  let mapped = rows.map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    title: r.title,
    category: r.category,
    content: r.content,
    tags: r.tags,
    score: Math.abs(Number(r.rank) || 1),
    source: db.prepare('SELECT source FROM documents WHERE id = ?').get(r.document_id)?.source || r.title,
  }));

  if (!mapped.length) {
    const docs = db.prepare('SELECT * FROM documents').all();
    mapped = docs.map((doc) => {
      const hay = `${doc.title} ${doc.tags || ''} ${doc.content}`.toLowerCase();
      let score = 0;
      tokens.forEach((t) => {
        if ((doc.tags || '').toLowerCase().includes(t)) score += 2;
        if (doc.title.toLowerCase().includes(t)) score += 1.5;
        if (hay.includes(t)) score += 0.4;
      });
      return {
        chunkId: `${doc.id}#0`,
        documentId: doc.id,
        title: doc.title,
        category: doc.category,
        content: doc.content.slice(0, 1200),
        tags: doc.tags,
        score,
        source: doc.source || doc.title,
      };
    }).filter((x) => x.score > 0.5);
  }

  // Escalation discipline: prefer same-category docs so admissions Q ≠ Wi-Fi cite
  if (preferredCategory) {
    const same = mapped.filter((m) => m.category === preferredCategory);
    if (same.length) mapped = same;
  }

  return mapped
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function retrievalConfidence(retrieved) {
  if (!retrieved.length) return 0;
  const top = retrieved[0];
  // Keyword path uses additive scores; FTS uses bm25 abs — normalize roughly
  if (top.score >= 2) return 0.9;
  if (top.score >= 1) return 0.7;
  if (top.score >= 0.5) return 0.55;
  return 0.35;
}
