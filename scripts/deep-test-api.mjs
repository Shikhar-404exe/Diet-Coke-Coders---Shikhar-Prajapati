/**
 * Deep API harness for Campus Triage — writes NDJSON to debug session log.
 * Run: node scripts/deep-test-api.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.API_BASE || 'http://localhost:8787';
const LOG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.cursor', 'debug-3a9bb9.log');
const sessionId = '3a9bb9';

function log(hypothesisId, message, data) {
  const line = JSON.stringify({
    sessionId,
    runId: 'deep-test-api',
    hypothesisId,
    location: 'scripts/deep-test-api.mjs',
    message,
    data,
    timestamp: Date.now(),
  });
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.appendFileSync(LOG, `${line}\n`);
  console.log(`[${hypothesisId}] ${message}`, data);
}

async function req(method, urlPath, { token, body } = {}) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 200) }; }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  const health = await req('GET', '/health');
  log('API', 'health', { ok: health.ok, status: health.status, body: health.data });

  const badStudent = await req('POST', '/auth/student', { body: { regNo: 'BAD', pin: '0000' } });
  log('AUTH', 'bad student login', { status: badStudent.status, ok: badStudent.ok });

  const student = await req('POST', '/auth/student', { body: { regNo: '22BCE1002', pin: 'vitb2026' } });
  log('AUTH', 'student login', { status: student.status, ok: student.ok, hasToken: Boolean(student.data?.token) });
  const st = student.data?.token;
  if (!st) {
    log('AUTH', 'ABORT no student token', {});
    process.exit(1);
  }

  const me = await req('GET', '/auth/me', { token: st });
  log('AUTH', 'student me', { status: me.status, role: me.data?.user?.role || me.data?.role });

  const ticketsOpen = await req('GET', '/tickets?status=open', { token: st });
  log('TKT', 'student open tickets', {
    status: ticketsOpen.status,
    count: Array.isArray(ticketsOpen.data) ? ticketsOpen.data.length : (ticketsOpen.data?.tickets?.length ?? null),
    shape: ticketsOpen.data && typeof ticketsOpen.data === 'object' ? Object.keys(ticketsOpen.data).slice(0, 8) : typeof ticketsOpen.data,
  });

  const outages = await req('GET', '/tickets/meta/outages', { token: st });
  log('TKT', 'outages', { status: outages.status, ok: outages.ok });

  const cases = [
    { id: 'wifi', message: 'How do I connect to campus VITB-Secure WiFi?', expect: ['ANSWER'] },
    { id: 'refuse', message: 'Write me a python homework solution for sorting algorithms', expect: ['REFUSAL', 'CLARIFY'] },
    { id: 'hostel', message: 'My hostel fan is broken in Block B room 205 please escalate', expect: ['ESCALATE_PROPOSE', 'ESCALATE', 'CLARIFY', 'ANSWER'] },
    { id: 'offtopic', message: 'What is the capital of France?', expect: ['REFUSAL'] },
  ];

  for (const c of cases) {
    const r = await req('POST', '/agent/chat', { token: st, body: { message: c.message } });
    const action = r.data?.plan?.action || r.data?.action || r.data?.result?.action || null;
    const reply = String(r.data?.reply || r.data?.result?.reply || '').slice(0, 120);
    const pass = c.expect.includes(action) || (r.ok && Boolean(reply));
    log('AGENT', `case:${c.id}`, {
      status: r.status,
      ok: r.ok,
      action,
      expect: c.expect,
      actionMatch: c.expect.includes(action),
      softPass: pass,
      replyPreview: reply,
      keys: r.data ? Object.keys(r.data).slice(0, 12) : [],
    });
  }

  const staff = await req('POST', '/auth/staff', { body: { id: 'ops.admin', password: 'campusops' } });
  log('AUTH', 'staff login', { status: staff.status, ok: staff.ok, hasToken: Boolean(staff.data?.token) });
  const at = staff.data?.token;
  if (at) {
    const adminTickets = await req('GET', '/tickets?status=open', { token: at });
    log('TKT', 'admin open tickets', {
      status: adminTickets.status,
      count: Array.isArray(adminTickets.data) ? adminTickets.data.length : (adminTickets.data?.tickets?.length ?? null),
    });
    const docs = await req('GET', '/documents', { token: at });
    log('KB', 'documents list', {
      status: docs.status,
      count: Array.isArray(docs.data) ? docs.data.length : (docs.data?.documents?.length ?? null),
    });
    const audit = await req('GET', '/tickets/audit/logs', { token: at });
    log('TKT', 'audit logs', { status: audit.status, ok: audit.ok });
    const forbidden = await req('GET', '/tickets/audit/logs', { token: st });
    log('AUTH', 'student blocked from audit', { status: forbidden.status, blocked: forbidden.status === 401 || forbidden.status === 403 });
  }

  log('DONE', 'api deep test finished', { at: new Date().toISOString() });
}

main().catch((err) => {
  log('FAIL', 'harness crashed', { err: String(err?.message || err) });
  process.exit(1);
});
