import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwtVerify, SignJWT } from 'jose';

// Types
interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  JWT_SECRET: string;
}

interface User {
  id: number;
  username: string;
  created_at: string;
}

const app = new Hono<{ Bindings: Env; Variables: { user?: User } }>();

app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// Auth middleware
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/auth/login' || c.req.path === '/api/auth/register') {
    return next();
  }
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401);
  }
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(auth.slice(7), secret);
    c.set('user', payload as unknown as User);
    await next();
  } catch {
    return c.json({ error: '登录已过期' }, 401);
  }
});

// === Auth Routes ===
app.post('/api/auth/register', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  if (!username || !password || username.length < 2 || password.length < 4) {
    return c.json({ error: '用户名至少2位，密码至少4位' }, 400);
  }
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) return c.json({ error: '用户名已存在' }, 409);

  const hashed = await hashPassword(password);
  const result = await c.env.DB.prepare('INSERT INTO users (username, password) VALUES (?, ?)').bind(username, hashed).run();
  const userId = result.meta.last_row_id;
  const token = await createToken(userId as number, username, c.env.JWT_SECRET);
  return c.json({ token, user: { id: userId, username } });
});

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  const user = await c.env.DB.prepare('SELECT id, username, password FROM users WHERE username = ?').bind(username).first<{ id: number; username: string; password: string }>();
  if (!user) return c.json({ error: '用户名或密码错误' }, 401);

  const valid = await verifyPassword(password, user.password);
  if (!valid) return c.json({ error: '用户名或密码错误' }, 401);

  const token = await createToken(user.id, user.username, c.env.JWT_SECRET);
  return c.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// === Conversations Routes ===
app.get('/api/conversations', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM conversations WHERE user_id = ? AND deleted = 0 ORDER BY pinned DESC, pinned_at DESC, updated_at DESC'
  ).bind(user!.id).all();
  return c.json({ conversations: rows.results.map(mapConversation) });
});

app.get('/api/conversations/trash', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM conversations WHERE user_id = ? AND deleted = 1 ORDER BY updated_at DESC'
  ).bind(user!.id).all();
  return c.json({ conversations: rows.results.map(mapConversation) });
});

app.post('/api/conversations', async (c) => {
  const user = c.get('user');
  const { title } = await c.req.json<{ title: string }>();
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(
    'INSERT INTO conversations (user_id, title, tags, stage, created_at, updated_at, deleted, pinned) VALUES (?, ?, ?, ?, ?, ?, 0, 0)'
  ).bind(user!.id, title || '新想法', '[]', 'inspiration', now, now).run();
  const id = result.meta.last_row_id;
  const row = await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first();
  return c.json({ conversation: mapConversation(row) }, 201);
});

app.put('/api/conversations/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<Record<string, unknown>>();
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (['title', 'tags', 'stage', 'pinned', 'deleted', 'maturityScore'].includes(key)) {
      fields.push(`${snake(key)} = ?`);
      values.push(key === 'tags' || key === 'maturityScore' ? JSON.stringify(value) : value);
    }
  }
  if (body.pinned === true) {
    fields.push('pinned_at = ?');
    values.push(new Date().toISOString());
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    await c.env.DB.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values, id, user!.id).run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first();
  return c.json({ conversation: mapConversation(row) });
});

app.delete('/api/conversations/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE conversations SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?')
    .bind(new Date().toISOString(), id, user!.id).run();
  return c.json({ ok: true });
});

// === Messages Routes ===
app.get('/api/conversations/:id/messages', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).bind(c.req.param('id')).all();
  return c.json({ messages: rows.results.map(mapMessage) });
});

app.post('/api/conversations/:id/messages', async (c) => {
  const user = c.get('user');
  const convId = c.req.param('id');
  const { role, content, analysis } = await c.req.json<{ role: string; content: string; analysis?: unknown }>();
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(
    'INSERT INTO messages (conversation_id, role, content, analysis, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(convId, role, content, analysis ? JSON.stringify(analysis) : null, now).run();

  await c.env.DB.prepare('UPDATE conversations SET updated_at = ? WHERE id = ? AND user_id = ?')
    .bind(now, convId, user!.id).run();

  const row = await c.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(result.meta.last_row_id).first();
  return c.json({ message: mapMessage(row) }, 201);
});

// === Notes Routes ===
app.get('/api/conversations/:id/note', async (c) => {
  const row = await c.env.DB.prepare(
    'SELECT * FROM notes WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(c.req.param('id')).first();
  return c.json({ note: row ? mapNote(row) : null });
});

app.post('/api/conversations/:id/note', async (c) => {
  const convId = c.req.param('id');
  const { content } = await c.req.json<{ content: string }>();
  await c.env.DB.prepare('DELETE FROM notes WHERE conversation_id = ?').bind(convId).run();
  const now = new Date().toISOString();
  const result = await c.env.DB.prepare(
    'INSERT INTO notes (conversation_id, content, created_at) VALUES (?, ?, ?)'
  ).bind(convId, content, now).run();
  const row = await c.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(result.meta.last_row_id).first();
  return c.json({ note: mapNote(row) }, 201);
});

// === File Upload ===
app.post('/api/upload', async (c) => {
  const user = c.get('user');
  const form = await c.req.formData();
  const file = form.get('file') as File;
  if (!file) return c.json({ error: '没有文件' }, 400);

  const key = `uploads/${user!.id}/${Date.now()}-${file.name}`;
  await c.env.FILES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ url: `/files/${key}`, filename: file.name, type: file.type });
});

app.get('/files/*', async (c) => {
  const key = c.req.path.slice(1);
  const obj = await c.env.FILES.get(key);
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

export default app;

// === Helpers ===
function snake(key: string): string {
  const map: Record<string, string> = { maturityScore: 'maturity_score', pinnedAt: 'pinned_at', updatedAt: 'updated_at', createdAt: 'created_at' };
  return map[key] || key;
}

function mapConversation(r: any) {
  if (!r) return null;
  return {
    id: r.id, title: r.title,
    tags: safeJson(r.tags, []),
    stage: r.stage, maturityScore: safeJson(r.maturity_score, null),
    createdAt: r.created_at, updatedAt: r.updated_at,
    deleted: !!r.deleted, pinned: !!r.pinned, pinnedAt: r.pinned_at,
  };
}

function mapMessage(r: any) {
  if (!r) return null;
  return {
    id: r.id, conversationId: r.conversation_id,
    role: r.role, content: r.content,
    analysis: safeJson(r.analysis, null),
    createdAt: r.created_at,
  };
}

function mapNote(r: any) {
  if (!r) return null;
  return { id: r.id, conversationId: r.conversation_id, content: r.content, createdAt: r.created_at };
}

function safeJson(s: string | null, fallback: any) {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

async function createToken(userId: number, username: string, secret: string): Promise<string> {
  return new SignJWT({ id: userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('90d')
    .sign(new TextEncoder().encode(secret));
}

async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw + 'thoughtcatcher-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function verifyPassword(pw: string, hashed: string): Promise<boolean> {
  return await hashPassword(pw) === hashed;
}
