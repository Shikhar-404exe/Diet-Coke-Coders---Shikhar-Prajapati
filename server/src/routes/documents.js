import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { db, uploadDir } from '../db/index.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { chunkText, indexDocumentFts } from '../db/seed.js';
import {
  listRagCandidates,
  promoteRagCandidate,
  rejectRagCandidate,
} from '../agent/selfImprove.js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) cb(null, true);
    else cb(new Error('Only PDF uploads allowed'));
  },
});

router.get('/', authRequired, (_req, res) => {
  const rows = db.prepare('SELECT id, title, category, source, tags, last_updated, file_path, created_at FROM documents ORDER BY category, title').all();
  res.json({ documents: rows });
});

router.get('/rag/candidates', authRequired, requireRole('admin'), (req, res) => {
  const status = String(req.query.status || 'pending');
  res.json({ candidates: listRagCandidates(status) });
});

router.post('/rag/candidates/:id/promote', authRequired, requireRole('admin'), (req, res) => {
  try {
    const out = promoteRagCandidate(req.params.id, req.user.name || 'ops');
    res.json(out);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/rag/candidates/:id/reject', authRequired, requireRole('admin'), (req, res) => {
  try {
    rejectRagCandidate(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', authRequired, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ document: doc });
});

router.post('/upload', authRequired, requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });
    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdf(buffer);
    const content = (parsed.text || '').trim();
    if (!content || content.length < 40) {
      return res.status(400).json({ error: 'Could not extract enough text from PDF' });
    }

    const id = `pdf-${randomUUID().slice(0, 8)}`;
    const title = String(req.body?.title || req.file.originalname.replace(/\.pdf$/i, '')).trim();
    const category = String(req.body?.category || 'Admissions').trim();
    const source = String(req.body?.source || req.file.originalname).trim();
    const tags = String(req.body?.tags || category.toLowerCase()).trim();

    db.prepare(`
      INSERT INTO documents (id, title, category, source, content, tags, file_path, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, title, category, source, content, tags, req.file.filename);

    const parts = chunkText(content, 120);
    const chunks = parts.map((text, i) => ({
      id: `${id}#${i}`,
      document_id: id,
      chunk_index: i,
      content: text,
    }));
    for (const c of chunks) {
      db.prepare(`INSERT INTO document_chunks (id, document_id, chunk_index, content) VALUES (?, ?, ?, ?)`)
        .run(c.id, c.document_id, c.chunk_index, c.content);
    }
    indexDocumentFts({ id, title, category, tags }, chunks);

    db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
      .run('SYSTEM', `PDF indexed: ${title} (${category})`);

    res.status(201).json({
      document: { id, title, category, source, tags, file_path: req.file.filename },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

router.post('/text', authRequired, requireRole('admin'), (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const category = String(req.body?.category || 'Academics').trim();
    const source = String(req.body?.source || 'Ops knowledge desk').trim();
    const tags = String(req.body?.tags || category.toLowerCase()).trim();
    if (!title || content.length < 40) {
      return res.status(400).json({ error: 'Title and content (40+ chars) required' });
    }
    const id = `doc-${randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO documents (id, title, category, source, content, tags, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, title, category, source, content, tags);
    const parts = chunkText(content, 120);
    const chunks = parts.map((text, i) => ({
      id: `${id}#${i}`,
      document_id: id,
      chunk_index: i,
      content: text,
    }));
    for (const c of chunks) {
      db.prepare(`INSERT INTO document_chunks (id, document_id, chunk_index, content) VALUES (?, ?, ?, ?)`)
        .run(c.id, c.document_id, c.chunk_index, c.content);
    }
    indexDocumentFts({ id, title, category, tags }, chunks);
    db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
      .run('SYSTEM', `Text policy indexed: ${title}`);
    res.status(201).json({ document: { id, title, category, source, tags } });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Index failed' });
  }
});

export default router;
