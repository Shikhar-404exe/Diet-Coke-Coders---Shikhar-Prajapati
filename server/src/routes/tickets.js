import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'node:path';
import { db, uploadDir } from '../db/index.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { enqueueRagCandidate } from '../agent/selfImprove.js';

const router = Router();

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `ticket-${Date.now()}-${safe}`);
  },
});
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG/PNG/WebP/GIF images allowed'));
  },
});

function parseNotes(raw) {
  try {
    const n = JSON.parse(raw || '[]');
    return Array.isArray(n) ? n : [];
  } catch {
    return [];
  }
}

function parseAttachments(raw) {
  try {
    const n = JSON.parse(raw || '[]');
    return Array.isArray(n) ? n : [];
  } catch {
    return [];
  }
}

function mapTicket(row) {
  if (!row) return null;
  let slots = {};
  let plan = null;
  try { slots = JSON.parse(row.slots_json || '{}'); } catch { /* ignore */ }
  try { plan = row.agent_plan_json ? JSON.parse(row.agent_plan_json) : null; } catch { /* ignore */ }

  const escalatedAt = new Date(row.escalated_at).getTime();
  const slaDuration = row.sla_duration_ms;
  const deadline = escalatedAt + slaDuration;
  const remainingMs = row.status === 'resolved' ? null : deadline - Date.now();
  const attachments = parseAttachments(row.attachments_json);

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
    workflow: row.workflow || (row.claimed_by ? 'in_progress' : row.status),
    claimedBy: row.claimed_by || null,
    claimedName: row.claimed_name || null,
    claimedAt: row.claimed_at ? new Date(row.claimed_at).getTime() : null,
    staffNotes: parseNotes(row.staff_notes_json),
    studentReply: row.student_reply || null,
    handoffSummary: row.handoff_summary || null,
    agentPlan: plan,
    attachments,
    slaDuration,
    escalatedAt,
    slaDeadline: deadline,
    slaRemainingMs: remainingMs,
    etaLabel: row.eta_label || null,
    contact: (row.owner_contact_name || row.owner_contact_phone)
      ? {
          name: row.owner_contact_name,
          phone: row.owner_contact_phone,
          email: row.owner_contact_email,
        }
      : null,
    timestamp: new Date(row.escalated_at).toLocaleString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).getTime() : null,
    slaMet: row.sla_met == null ? undefined : Boolean(row.sla_met),
    resolutionTimeMinutes: row.resolution_minutes,
  };
}

function notifyStudent(ticket, title, body) {
  if (!ticket.owner_reg_no) return;
  db.prepare(`
    INSERT INTO notifications (id, user_login_id, ticket_id, title, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), ticket.owner_reg_no, ticket.id, title, body);
}

function detectIncidents() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const rows = db.prepare(`
    SELECT intent, department, COUNT(*) AS c
    FROM tickets
    WHERE status = 'open' AND escalated_at >= ?
    GROUP BY intent, department
    HAVING c >= 3
  `).all(since);

  const incidents = [];
  for (const r of rows) {
    const id = `incident-${String(r.intent || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const title = `Possible incident: ${r.intent || 'campus issue'}`;
    const body = `${r.c} similar open tickets for ${r.department} in the last 30 minutes. Prefer checking known status before filing duplicates.`;
    const existing = db.prepare('SELECT id FROM campus_outages WHERE id = ?').get(id);
    if (existing) {
      db.prepare('UPDATE campus_outages SET title = ?, body = ?, active = 1 WHERE id = ?')
        .run(title, body, id);
    } else {
      db.prepare('INSERT INTO campus_outages (id, title, body, active) VALUES (?, ?, ?, 1)')
        .run(id, title, body);
    }
    incidents.push({ id, title, body, count: r.c, intent: r.intent, department: r.department });
  }
  return incidents;
}

router.get('/', authRequired, (req, res) => {
  const status = req.query.status || 'open';
  const dept = req.query.department ? String(req.query.department) : null;
  const sort = req.query.sort || 'sla';

  if (req.user.role === 'student') {
    if (status === 'all') {
      const rows = db.prepare(`
        SELECT * FROM tickets WHERE owner_reg_no = ? ORDER BY escalated_at DESC
      `).all(req.user.login_id);
      return res.json({ tickets: rows.map(mapTicket) });
    }
    const rows = db.prepare(`
      SELECT * FROM tickets
      WHERE owner_reg_no = ? AND status = ?
      ORDER BY escalated_at DESC
    `).all(req.user.login_id, status);
    return res.json({ tickets: rows.map(mapTicket) });
  }

  // Staff: optional department scope (match staff department loosely)
  let rows;
  if (status === 'all') {
    rows = db.prepare('SELECT * FROM tickets ORDER BY escalated_at DESC').all();
  } else {
    rows = db.prepare('SELECT * FROM tickets WHERE status = ? ORDER BY escalated_at DESC').all(status);
  }

  if (dept) {
    const d = dept.toLowerCase();
    rows = rows.filter((r) => String(r.department).toLowerCase().includes(d)
      || (d.includes('it') && String(r.department).toLowerCase().includes('it'))
      || (d.includes('hostel') && String(r.department).toLowerCase().includes('hostel'))
      || (d.includes('finance') && String(r.department).toLowerCase().includes('finance')));
  } else if (req.user.department && !String(req.user.department).toLowerCase().includes('central')) {
    const d = String(req.user.department).toLowerCase();
    const scoped = rows.filter((r) => String(r.department).toLowerCase().includes(
      d.includes('it') ? 'it' : d.includes('hostel') ? 'hostel' : d.slice(0, 6)
    ));
    if (scoped.length) rows = scoped;
  }

  let tickets = rows.map(mapTicket);
  if (sort === 'sla') {
    tickets = tickets.sort((a, b) => {
      if (a.status === 'resolved' && b.status !== 'resolved') return 1;
      if (b.status === 'resolved' && a.status !== 'resolved') return -1;
      return (a.slaRemainingMs ?? 1e15) - (b.slaRemainingMs ?? 1e15);
    });
  }
  res.json({ tickets });
});

router.get('/meta/notifications', authRequired, (req, res) => {
  const loginId = req.user.role === 'student' ? req.user.login_id : null;
  if (!loginId) return res.json({ notifications: [] });
  const rows = db.prepare(`
    SELECT * FROM notifications WHERE user_login_id = ?
    ORDER BY created_at DESC LIMIT 30
  `).all(loginId);
  res.json({
    notifications: rows.map((r) => ({
      id: r.id,
      ticketId: r.ticket_id,
      title: r.title,
      body: r.body,
      read: Boolean(r.read),
      createdAt: new Date(r.created_at).getTime(),
    })),
  });
});

router.post('/meta/notifications/read', authRequired, (req, res) => {
  if (req.user.role !== 'student') return res.json({ ok: true });
  db.prepare(`UPDATE notifications SET read = 1 WHERE user_login_id = ?`).run(req.user.login_id);
  res.json({ ok: true });
});

router.get('/meta/outages', authRequired, (_req, res) => {
  detectIncidents();
  const rows = db.prepare(`SELECT * FROM campus_outages WHERE active = 1 ORDER BY created_at DESC`).all();
  res.json({
    outages: rows.map((r) => ({ id: r.id, title: r.title, body: r.body })),
  });
});

router.get('/meta/incidents', authRequired, (_req, res) => {
  const incidents = detectIncidents();
  res.json({ incidents });
});

router.get('/audit/logs', authRequired, requireRole('admin'), (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();
  res.json({
    logs: rows.map((r) => ({
      time: new Date(r.created_at).toLocaleTimeString(),
      type: r.type,
      message: r.message,
    })),
  });
});

router.get('/:id', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Ticket not found' });
  if (req.user.role === 'student' && row.owner_reg_no !== req.user.login_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ ticket: mapTicket(row) });
});

router.post(
  '/',
  authRequired,
  rateLimit({
    windowMs: 10 * 60_000,
    max: 8,
    keyFn: (req) => `ticket:${req.user?.id || req.ip}`,
  }),
  (req, res) => {
  const body = req.body || {};
  const id = body.id || `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
  const ownerReg = req.user.role === 'student' ? req.user.login_id : (body.ownerRegNo || null);
  const ownerEmail = req.user.role === 'student' ? req.user.email : (body.ownerEmail || null);
  const ownerName = req.user.role === 'student' ? req.user.name : (body.ownerName || null);
  const priority = body.priority || 'Medium';
  const sla = body.slaDuration || (priority === 'High' ? 1800000 : 7200000);

  db.prepare(`
    INSERT INTO tickets (
      id, owner_reg_no, owner_email, owner_name, student_query, intent, department,
      priority, sentiment, slots_json, status, workflow, sla_duration_ms, escalated_at,
      handoff_summary, staff_notes_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'open', ?, datetime('now'), ?, '[]')
  `).run(
    id,
    ownerReg,
    ownerEmail,
    ownerName,
    body.studentQuery || body.query || '',
    body.intent || 'GENERAL_ACADEMIC',
    body.department || 'General Academic Support',
    priority,
    body.sentiment || 'Neutral',
    JSON.stringify(body.slots || {}),
    sla,
    body.handoffSummary || 'Manual ticket'
  );

  db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`).run(
    'SYSTEM',
    `Ticket ${id} created for ${ownerReg || 'unknown'} → ${body.department || 'General Academic Support'}`
  );

  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  res.status(201).json({ ticket: mapTicket(row) });
});

router.patch('/:id', authRequired, requireRole('admin'), (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const action = req.body?.action;
  const note = String(req.body?.note || '').trim();
  const studentMessage = String(req.body?.studentMessage || '').trim();

  if (action === 'claim') {
    db.prepare(`
      UPDATE tickets SET claimed_by = ?, claimed_name = ?, claimed_at = datetime('now'), workflow = 'in_progress'
      WHERE id = ?
    `).run(req.user.login_id, req.user.name, ticket.id);
    db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
      .run('OPS', `${req.user.name} claimed ${ticket.id}`);
  } else if (action === 'note') {
    if (!note) return res.status(400).json({ error: 'note required' });
    const notes = parseNotes(ticket.staff_notes_json);
    notes.push({
      id: randomUUID(),
      by: req.user.name,
      staffId: req.user.login_id,
      text: note,
      at: Date.now(),
      internal: true,
    });
    db.prepare(`UPDATE tickets SET staff_notes_json = ? WHERE id = ?`)
      .run(JSON.stringify(notes), ticket.id);
  } else if (action === 'reply_student') {
    if (!studentMessage) return res.status(400).json({ error: 'studentMessage required' });
    db.prepare(`UPDATE tickets SET student_reply = ?, workflow = COALESCE(workflow, 'in_progress') WHERE id = ?`)
      .run(studentMessage, ticket.id);
    notifyStudent(ticket, `Update on ${ticket.id}`, studentMessage);
    db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
      .run('OPS', `Student-visible reply on ${ticket.id}`);
  } else if (action === 'resolve') {
    const escalated = new Date(ticket.escalated_at).getTime();
    const resolvedAt = Date.now();
    const minutes = Math.round((resolvedAt - escalated) / 60000);
    const slaMet = (resolvedAt - escalated) <= ticket.sla_duration_ms ? 1 : 0;
    const notes = parseNotes(ticket.staff_notes_json);
    if (note) {
      notes.push({
        id: randomUUID(),
        by: req.user.name,
        staffId: req.user.login_id,
        text: note,
        at: Date.now(),
        internal: true,
        resolution: true,
      });
    }
    const publicReply = studentMessage || note || `Your request ${ticket.id} has been resolved by campus staff.`;
    db.prepare(`
      UPDATE tickets SET status = 'resolved', workflow = 'resolved', resolved_at = ?, sla_met = ?,
        resolution_minutes = ?, staff_notes_json = ?, student_reply = ?
      WHERE id = ?
    `).run(
      new Date(resolvedAt).toISOString(),
      slaMet,
      minutes,
      JSON.stringify(notes),
      publicReply,
      ticket.id
    );
    notifyStudent(
      ticket,
      `${ticket.id} resolved`,
      publicReply
    );
    db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
      .run('OPS', `Resolved ${ticket.id} in ${minutes}m (${slaMet ? 'SLA Met' : 'SLA Breached'})`);
    enqueueRagCandidate({
      source: 'ticket_resolve',
      query: ticket.student_query,
      answer: publicReply,
      intent: ticket.intent,
      category: 'Academics',
      ticketId: ticket.id,
      confidence: 0.7,
    });
  } else if (action === 'reopen') {
    const reason = note || 'Reopened by staff';
    const notes = parseNotes(ticket.staff_notes_json);
    notes.push({
      id: randomUUID(),
      by: req.user.name,
      staffId: req.user.login_id,
      text: reason,
      at: Date.now(),
      reopen: true,
    });
    db.prepare(`
      UPDATE tickets SET status = 'open', workflow = 'open', resolved_at = NULL, sla_met = NULL,
        resolution_minutes = NULL, escalated_at = datetime('now'), staff_notes_json = ?
      WHERE id = ?
    `).run(JSON.stringify(notes), ticket.id);
    notifyStudent(ticket, `${ticket.id} reopened`, reason);
  } else {
    return res.status(400).json({
      error: 'action must be claim | note | reply_student | resolve | reopen',
    });
  }

  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);
  res.json({ ticket: mapTicket(row) });
});

router.post('/:id/photo', authRequired, photoUpload.single('photo'), (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (req.user.role === 'student' && ticket.owner_reg_no !== req.user.login_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!req.file) return res.status(400).json({ error: 'photo required' });

  const attachment = {
    id: randomUUID(),
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    url: `/uploads/${req.file.filename}`,
    uploadedBy: req.user.login_id,
    at: Date.now(),
  };

  const list = parseAttachments(ticket.attachments_json);
  list.push(attachment);
  db.prepare('UPDATE tickets SET attachments_json = ? WHERE id = ?')
    .run(JSON.stringify(list), ticket.id);
  db.prepare(`
    INSERT INTO ticket_attachments (id, ticket_id, file_name, mime_type, uploaded_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(attachment.id, ticket.id, attachment.fileName, attachment.mimeType, attachment.uploadedBy);

  db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`)
    .run('SYSTEM', `Photo attached to ${ticket.id} by ${req.user.login_id}`);

  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticket.id);
  res.status(201).json({ ticket: mapTicket(row), attachment });
});

export default router;
