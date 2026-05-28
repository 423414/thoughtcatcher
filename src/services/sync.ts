import { getConversations, getMessages, createConversation, addMessage, createNote, getNote, updateConversation } from '../db';
import { getToken } from './api';

const API = 'https://thoughtcatcher-api.liuyurun16.workers.dev';

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

async function safeFetch(url: string, opts: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// === Push local data to cloud ===
export async function pushToCloud(
  onProgress?: (msg: string) => void
): Promise<{ uploaded: number; error?: string }> {
  if (!getToken()) throw new Error('请先登录');

  const conversations = await getConversations();
  let uploaded = 0;
  onProgress?.(`准备上传 ${conversations.length} 个想法...`);

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    onProgress?.(`上传中 (${i + 1}/${conversations.length}): ${conv.title}`);

    try {
      const res = await safeFetch(`${API}/api/conversations`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ title: conv.title }),
      }, 20000);
      if (!res.ok) continue;
      const { conversation: serverConv } = await res.json();

      await safeFetch(`${API}/api/conversations/${serverConv.id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ tags: JSON.stringify(conv.tags), stage: conv.stage, pinned: conv.pinned }),
      }, 10000);

      const messages = await getMessages(conv.id!);
      for (const msg of messages) {
        await safeFetch(`${API}/api/conversations/${serverConv.id}/messages`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ role: msg.role, content: msg.content, analysis: msg.analysis }),
        }, 10000);
      }

      const note = await getNote(conv.id!);
      if (note) {
        await safeFetch(`${API}/api/conversations/${serverConv.id}/note`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ content: note.content }),
        }, 10000);
      }

      uploaded++;
    } catch {
      // Skip failed conversation, continue with next
      onProgress?.(`跳过失败: ${conv.title}`);
    }
  }

  return { uploaded };
}

// === Pull cloud data to local ===
export async function pullFromCloud(
  onProgress?: (msg: string) => void
): Promise<{ downloaded: number; error?: string }> {
  if (!getToken()) throw new Error('请先登录');

  let downloaded = 0;

  onProgress?.('正在连接服务器...');
  const res = await safeFetch(`${API}/api/conversations`, { headers: headers() }, 20000);
  if (!res.ok) {
    if (res.status === 401) throw new Error('登录已过期，请重新登录');
    throw new Error(`服务器错误 (${res.status})。Cloudflare 在国内可能无法直连，请尝试开启梯子后重试。`);
  }

  const { conversations } = await res.json();
  if (!Array.isArray(conversations)) throw new Error('数据格式错误');

  onProgress?.(`找到 ${conversations.length} 个云端想法`);
  const localConvs = await getConversations();

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    onProgress?.(`下载中 (${i + 1}/${conversations.length}): ${conv.title}`);

    try {
      const exists = localConvs.find((c) =>
        c.title === conv.title &&
        Math.abs(new Date(c.createdAt).getTime() - new Date(conv.createdAt).getTime()) < 120000
      );
      let localId: number;

      if (exists) {
        localId = exists.id!;
        await updateConversation(localId, { tags: conv.tags, stage: conv.stage, pinned: conv.pinned });
      } else {
        localId = await createConversation(conv.title);
        await updateConversation(localId, { tags: conv.tags, stage: conv.stage, pinned: conv.pinned });
      }

      onProgress?.(`下载消息中 (${i + 1}/${conversations.length})...`);
      const msgRes = await safeFetch(`${API}/api/conversations/${conv.id}/messages`, { headers: headers() }, 15000);
      if (msgRes.ok) {
        const { messages } = await msgRes.json();
        const existingMsgs = await getMessages(localId);
        for (const msg of messages || []) {
          const dup = existingMsgs.find((m) =>
            m.role === msg.role && m.content === msg.content &&
            Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 120000
          );
          if (!dup) {
            await addMessage({ conversationId: localId, role: msg.role, content: msg.content, analysis: msg.analysis });
          }
        }
      }

      const noteRes = await safeFetch(`${API}/api/conversations/${conv.id}/note`, { headers: headers() }, 10000);
      if (noteRes.ok) {
        const { note } = await noteRes.json();
        if (note) {
          await createNote({ conversationId: localId, content: note.content });
        }
      }

      downloaded++;
    } catch {
      onProgress?.(`跳过失败: ${conv.title}`);
    }
  }

  return { downloaded };
}

// === Quick test connection ===
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!getToken()) return { ok: false, error: '未登录' };
  try {
    const res = await safeFetch(`${API}/api/auth/me`, { headers: headers() }, 8000);
    if (res.ok) return { ok: true };
    return { ok: false, error: `服务器错误 ${res.status}` };
  } catch {
    return { ok: false, error: '无法连接服务器。Cloudflare 在国内可能需要梯子。' };
  }
}
