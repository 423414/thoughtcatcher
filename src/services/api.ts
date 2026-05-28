const API_URL = import.meta.env.VITE_API_URL || 'https://thoughtcatcher-api.your-domain.workers.dev';

let token: string | null = localStorage.getItem('tc_token');

export function getToken() { return token; }

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '登录失败');
  token = data.token;
  localStorage.setItem('tc_token', token!);
  return data.user;
}

export async function register(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '注册失败');
  token = data.token;
  localStorage.setItem('tc_token', token!);
  return data.user;
}

export function logout() {
  token = null;
  localStorage.removeItem('tc_token');
}

async function authFetch(path: string, opts: RequestInit = {}) {
  if (!token) throw new Error('未登录');
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...opts.headers as Record<string, string>,
    },
  });
  if (res.status === 401) { logout(); throw new Error('登录已过期'); }
  return res;
}

// Conversations
export async function fetchConversations() {
  const res = await authFetch('/api/conversations');
  return (await res.json()).conversations;
}

export async function fetchTrashConversations() {
  const res = await authFetch('/api/conversations/trash');
  return (await res.json()).conversations;
}

export async function createConv(title: string) {
  const res = await authFetch('/api/conversations', {
    method: 'POST', body: JSON.stringify({ title }),
  });
  return (await res.json()).conversation;
}

export async function updateConv(id: number, changes: Record<string, unknown>) {
  const res = await authFetch(`/api/conversations/${id}`, {
    method: 'PUT', body: JSON.stringify(changes),
  });
  return (await res.json()).conversation;
}

export async function deleteConv(id: number) {
  await authFetch(`/api/conversations/${id}`, { method: 'DELETE' });
}

export async function permanentDeleteConv(id: number) {
  const res = await authFetch(`/api/conversations/${id}`, { method: 'DELETE' });
  if (res.ok) {
    // For permanent delete we need a different endpoint
    await authFetch(`/api/conversations/${id}/permanent`, { method: 'DELETE' });
  }
}

// Messages
export async function fetchMessages(convId: number) {
  const res = await authFetch(`/api/conversations/${convId}/messages`);
  return (await res.json()).messages;
}

export async function addMsg(convId: number, role: string, content: string, analysis?: unknown) {
  const res = await authFetch(`/api/conversations/${convId}/messages`, {
    method: 'POST', body: JSON.stringify({ role, content, analysis }),
  });
  return (await res.json()).message;
}

// Notes
export async function fetchNote(convId: number) {
  const res = await authFetch(`/api/conversations/${convId}/note`);
  return (await res.json()).note;
}

export async function saveNote(convId: number, content: string) {
  const res = await authFetch(`/api/conversations/${convId}/note`, {
    method: 'POST', body: JSON.stringify({ content }),
  });
  return (await res.json()).note;
}

// File upload
export async function uploadFile(file: File) {
  if (!token) throw new Error('未登录');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  return (await res.json()) as { url: string; filename: string; type: string };
}
