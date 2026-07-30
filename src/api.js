const TOKEN_KEY = 'campusTriageToken';
const API_BASE = import.meta.env.VITE_API_BASE || '';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body instanceof FormData
      ? options.body
      : options.body != null
        ? JSON.stringify(options.body)
        : undefined,
  });

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data?.error || `API ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function healthCheck() {
  try {
    return await api('/health');
  } catch {
    return null;
  }
}

export async function loginStudentApi(regNo, pin) {
  const data = await api('/auth/student', { method: 'POST', body: { regNo, pin } });
  setToken(data.token);
  return data;
}

export async function loginStaffApi(id, password) {
  const data = await api('/auth/staff', { method: 'POST', body: { id, password } });
  setToken(data.token);
  return data;
}

export async function logoutApi() {
  try {
    await api('/auth/logout', { method: 'POST', body: {} });
  } catch {
    /* offline */
  }
  setToken(null);
}

export async function fetchMe() {
  return api('/auth/me');
}

export async function fetchTickets(status = 'open', opts = {}) {
  const q = new URLSearchParams({ status });
  if (opts.department) q.set('department', opts.department);
  if (opts.sort) q.set('sort', opts.sort);
  return api(`/tickets?${q}`);
}

export async function fetchTicket(id) {
  return api(`/tickets/${encodeURIComponent(id)}`);
}

export async function patchTicket(id, action, extra = {}) {
  return api(`/tickets/${id}`, { method: 'PATCH', body: { action, ...extra } });
}

export async function fetchAuditLogs() {
  return api('/tickets/audit/logs');
}

export async function fetchNotifications() {
  return api('/tickets/meta/notifications');
}

export async function markNotificationsRead() {
  return api('/tickets/meta/notifications/read', { method: 'POST', body: {} });
}

export async function fetchOutages() {
  return api('/tickets/meta/outages');
}

export async function agentChat(message, opts = {}) {
  return api('/agent/chat', {
    method: 'POST',
    body: {
      message,
      confirmEscalate: Boolean(opts.confirmEscalate),
      pendingEscalate: opts.pendingEscalate || null,
    },
  });
}

export async function fetchDocuments() {
  return api('/documents');
}

export async function uploadPdf({ file, title, category, tags }) {
  const form = new FormData();
  form.append('file', file);
  if (title) form.append('title', title);
  if (category) form.append('category', category);
  if (tags) form.append('tags', tags);
  return api('/documents/upload', { method: 'POST', body: form, headers: {} });
}

export async function uploadTicketPhoto(ticketId, file) {
  const form = new FormData();
  form.append('photo', file);
  return api(`/tickets/${encodeURIComponent(ticketId)}/photo`, {
    method: 'POST',
    body: form,
    headers: {},
  });
}

export async function fetchRagCandidates(status = 'pending') {
  return api(`/documents/rag/candidates?status=${encodeURIComponent(status)}`);
}

export async function promoteRagCandidate(id) {
  return api(`/documents/rag/candidates/${encodeURIComponent(id)}/promote`, { method: 'POST', body: {} });
}

export async function rejectRagCandidate(id) {
  return api(`/documents/rag/candidates/${encodeURIComponent(id)}/reject`, { method: 'POST', body: {} });
}
