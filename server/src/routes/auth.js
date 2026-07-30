import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { createSession, destroySession, authRequired, publicUser } from '../middleware/auth.js';

const router = Router();

router.post('/student', (req, res) => {
  const loginId = String(req.body?.regNo || '').trim().toUpperCase();
  const pin = String(req.body?.pin || '').trim();
  const user = db.prepare(`SELECT * FROM users WHERE role = 'student' AND UPPER(login_id) = ?`).get(loginId);
  if (!user || !bcrypt.compareSync(pin, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid registration number or PIN' });
  }
  const { token, expiresAt } = createSession(user.id);
  db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`).run(
    'SYSTEM',
    `Student ${user.name} (${user.login_id}) signed in.`
  );
  res.json({ token, expiresAt, session: publicUser(user) });
});

router.post('/staff', (req, res) => {
  const loginId = String(req.body?.id || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();
  const user = db.prepare(`SELECT * FROM users WHERE role = 'admin' AND LOWER(login_id) = ?`).get(loginId);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid staff ID or password' });
  }
  const { token, expiresAt } = createSession(user.id);
  db.prepare(`INSERT INTO audit_logs (type, message) VALUES (?, ?)`).run(
    'SYSTEM',
    `Staff ${user.name} (${user.login_id}) signed in.`
  );
  res.json({ token, expiresAt, session: publicUser(user) });
});

router.post('/logout', authRequired, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

router.get('/me', authRequired, (req, res) => {
  res.json({ session: publicUser(req.user) });
});

export default router;
