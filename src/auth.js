import {
  loginStudentApi,
  loginStaffApi,
  logoutApi,
  setToken,
  getToken,
  fetchMe,
} from './api';

const SESSION_KEY = 'campusTriageSession';

export const STUDENT_DEMO_PIN = 'vitb2026';

export const DEMO_STUDENTS = [
  { regNo: '22BCE1001', name: 'Arjun Sharma', program: 'BTech CSE', year: 3, hostel: 'Block A', room: '101', email: 'arjun.sharma@vitbhopal.ac.in', cgpa: 8.7 },
  { regNo: '22BCE1002', name: 'Priya Patel', program: 'BTech CSE', year: 3, hostel: 'Block B', room: '205', email: 'priya.patel@vitbhopal.ac.in', cgpa: 9.2 },
  { regNo: '22BME2001', name: 'Rahul Verma', program: 'BTech Mech', year: 3, hostel: 'Block A', room: '310', email: 'rahul.verma@vitbhopal.ac.in', cgpa: 7.5 },
  { regNo: '22BIT1023', name: 'Sneha Reddy', program: 'BTech IT', year: 3, hostel: 'Block C', room: '405', email: 'sneha.reddy@vitbhopal.ac.in', cgpa: 8.1 },
  { regNo: '22BCE2005', name: 'Vikram Singh', program: 'BTech CSE', year: 3, hostel: 'Block B', room: '502', email: 'vikram.singh@vitbhopal.ac.in', cgpa: 6.8 },
];

export const DEMO_ADMINS = [
  { id: 'ops.admin', password: 'campusops', name: 'Meera Iyer', title: 'Academic Operations Lead', department: 'Central Helpdesk' },
  { id: 'it.desk', password: 'ithelp', name: 'Rahul Verma', title: 'IT Support Lead', department: 'IT Support Services' },
];

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** Prefer API; fall back to local demo auth if API is down. */
export async function loginStudent(regNo, pin) {
  try {
    const data = await loginStudentApi(regNo, pin);
    return { ok: true, session: saveSession(data.session), via: 'api' };
  } catch (err) {
    const student = DEMO_STUDENTS.find(s => s.regNo.toUpperCase() === String(regNo || '').trim().toUpperCase());
    if (!student) return { ok: false, error: err?.message || 'Unknown registration number' };
    if (String(pin || '').trim() !== STUDENT_DEMO_PIN) {
      return { ok: false, error: 'Incorrect PIN. Demo PIN is vitb2026' };
    }
    setToken(null);
    const session = saveSession({
      role: 'student',
      student: { ...student },
      loggedInAt: Date.now(),
      offline: true,
    });
    return { ok: true, session, via: 'offline' };
  }
}

export async function loginAdmin(id, password) {
  try {
    const data = await loginStaffApi(id, password);
    return { ok: true, session: saveSession(data.session), via: 'api' };
  } catch (err) {
    const admin = DEMO_ADMINS.find(a => a.id.toLowerCase() === String(id || '').trim().toLowerCase());
    if (!admin) return { ok: false, error: err?.message || 'Unknown staff ID' };
    if (admin.password !== String(password || '').trim()) {
      return { ok: false, error: 'Incorrect password' };
    }
    setToken(null);
    const session = saveSession({
      role: 'admin',
      admin: { id: admin.id, name: admin.name, title: admin.title, department: admin.department },
      loggedInAt: Date.now(),
      offline: true,
    });
    return { ok: true, session, via: 'offline' };
  }
}

export function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session?.role !== 'student' && session?.role !== 'admin') return null;
    return session;
  } catch {
    return null;
  }
}

/** Validate API token; keep offline sessions as-is. */
export async function validateSession() {
  const session = restoreSession();
  if (!session) return null;
  if (session.offline || !getToken()) return session;
  try {
    const data = await fetchMe();
    return saveSession(data.session);
  } catch {
    setToken(null);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/** When API is back but the browser only has an offline session, re-issue a live token. */
export async function reconnectSession() {
  const session = restoreSession();
  if (!session) return null;
  if (getToken() && !session.offline) {
    try {
      const data = await fetchMe();
      return saveSession(data.session);
    } catch {
      setToken(null);
    }
  }

  try {
    if (session.role === 'student' && session.student?.regNo) {
      const data = await loginStudentApi(session.student.regNo, STUDENT_DEMO_PIN);
      return saveSession({ ...data.session, offline: false });
    }
    if (session.role === 'admin' && session.admin?.id) {
      const admin = DEMO_ADMINS.find((a) => a.id.toLowerCase() === String(session.admin.id).toLowerCase());
      if (!admin) return null;
      const data = await loginStaffApi(admin.id, admin.password);
      return saveSession({ ...data.session, offline: false });
    }
  } catch {
    return null;
  }
  return null;
}

export async function clearSession() {
  await logoutApi();
  localStorage.removeItem(SESSION_KEY);
}

/** Wipe demo ticket/session caches so Student My Requests reseeds cleanly. */
export function resetDemoData() {
  [
    'tickets',
    'resolvedTickets',
    'ticketsVersion',
    'auditLogs',
    'groundedCount',
    'refusalCount',
    'studentPortal',
    SESSION_KEY,
  ].forEach((k) => localStorage.removeItem(k));
  setToken(null);
  localStorage.setItem('ticketsVersion', '5');
}
