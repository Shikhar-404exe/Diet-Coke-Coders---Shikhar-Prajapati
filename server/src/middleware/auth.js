import { randomBytes } from 'node:crypto';
import { db } from '../db/index.js';

const SESSION_HOURS = 24 * 7;

export function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_HOURS * 3600000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return { token, expiresAt: expires };
}

export function destroySession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function getUserFromToken(token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.*, s.expires_at AS session_expires
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);
  if (!row) return null;
  if (new Date(row.session_expires).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  return row;
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-session-token'] || '');
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  req.token = token;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export function publicUser(user) {
  if (!user) return null;
  if (user.role === 'student') {
    return {
      role: 'student',
      student: {
        regNo: user.login_id,
        name: user.name,
        email: user.email,
        program: user.program,
        year: user.year,
        hostel: user.hostel,
        room: user.room,
        cgpa: user.cgpa,
      },
      loggedInAt: Date.now(),
    };
  }
  return {
    role: 'admin',
    admin: {
      id: user.login_id,
      name: user.name,
      title: user.title,
      department: user.department,
      email: user.email,
    },
    loggedInAt: Date.now(),
  };
}
