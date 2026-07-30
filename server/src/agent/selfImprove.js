import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { chunkText, indexDocumentFts } from '../db/seed.js';

/** Queue a Q&A snippet for admin review → self-improving RAG. */
export function enqueueRagCandidate({
  source = 'ticket_resolve',
  query,
  answer,
  intent,
  category = 'Academics',
  ticketId = null,
  confidence = 0.5,
}) {
  const q = String(query || '').trim();
  const a = String(answer || '').trim();
  if (q.length < 12 || a.length < 24) return null;

  const existing = db.prepare(`
    SELECT id FROM rag_candidates
    WHERE status = 'pending' AND lower(query) = lower(?)
    LIMIT 1
  `).get(q);
  if (existing) return existing.id;

  const id = randomUUID();
  db.prepare(`
    INSERT INTO rag_candidates (
      id, source, query, answer, intent, category, ticket_id, confidence, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, source, q, a, intent || null, category, ticketId, confidence);

  db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
    .run('RAG', `Self-improve candidate queued (${source}): ${q.slice(0, 60)}`);

  return id;
}

export function listRagCandidates(status = 'pending') {
  return db.prepare(`
    SELECT * FROM rag_candidates
    WHERE (? = 'all' OR status = ?)
    ORDER BY created_at DESC
    LIMIT 100
  `).all(status, status);
}

/** Promote candidate into approved documents + FTS. */
export function promoteRagCandidate(id, adminName = 'ops') {
  const row = db.prepare('SELECT * FROM rag_candidates WHERE id = ?').get(id);
  if (!row) throw new Error('Candidate not found');
  if (row.status === 'promoted') return { already: true, documentId: row.promoted_doc_id };

  const docId = `learn-${id.slice(0, 8)}`;
  const title = `Learned: ${(row.intent || 'campus').replace(/_/g, ' ')} — ${row.query.slice(0, 48)}`;
  const content = `Student asked: ${row.query}\n\nApproved campus response:\n${row.answer}\n\n(Promoted by ${adminName} via self-improving RAG)`;
  const category = row.category || 'Academics';
  const tags = `learned,${(row.intent || 'general').toLowerCase()},self-improve`;

  db.prepare(`
    INSERT INTO documents (id, title, category, source, content, tags, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(docId, title, category, 'Self-improving RAG', content, tags);

  const parts = chunkText(content, 120);
  const chunks = parts.map((text, i) => ({
    id: `${docId}#${i}`,
    document_id: docId,
    chunk_index: i,
    content: text,
  }));
  for (const c of chunks) {
    db.prepare(`INSERT INTO document_chunks (id, document_id, chunk_index, content) VALUES (?, ?, ?, ?)`)
      .run(c.id, c.document_id, c.chunk_index, c.content);
  }
  indexDocumentFts({ id: docId, title, category, tags }, chunks);

  db.prepare(`
    UPDATE rag_candidates
    SET status = 'promoted', promoted_doc_id = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `).run(docId, id);

  db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
    .run('RAG', `Promoted self-improve doc ${docId} by ${adminName}`);

  return { documentId: docId, title };
}

export function rejectRagCandidate(id) {
  db.prepare(`
    UPDATE rag_candidates SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?
  `).run(id);
}
