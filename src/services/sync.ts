import { getConversations, getMessages, createConversation, addMessage, createNote, getNote, updateConversation } from '../db';
import { getToken } from './api';

const API = 'https://thoughtcatcher-api.liuyurun16.workers.dev';

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

// === Push local data to cloud ===
export async function pushToCloud(): Promise<{ uploaded: number }> {
  if (!getToken()) throw new Error('请先登录');
  const conversations = await getConversations();
  let uploaded = 0;

  for (const conv of conversations) {
    // Create conversation on server
    const res = await fetch(`${API}/api/conversations`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ title: conv.title }),
    });
    if (!res.ok) continue;
    const { conversation: serverConv } = await res.json();

    // Update tags, stage
    await fetch(`${API}/api/conversations/${serverConv.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ tags: JSON.stringify(conv.tags), stage: conv.stage, pinned: conv.pinned }),
    });

    // Push messages
    const messages = await getMessages(conv.id!);
    for (const msg of messages) {
      await fetch(`${API}/api/conversations/${serverConv.id}/messages`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ role: msg.role, content: msg.content, analysis: msg.analysis }),
      });
    }

    // Push note
    const note = await getNote(conv.id!);
    if (note) {
      await fetch(`${API}/api/conversations/${serverConv.id}/note`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ content: note.content }),
      });
    }

    uploaded++;
  }

  return { uploaded };
}

// === Pull cloud data to local ===
export async function pullFromCloud(): Promise<{ downloaded: number }> {
  if (!getToken()) throw new Error('请先登录');

  const res = await fetch(`${API}/api/conversations`, { headers: headers() });
  if (!res.ok) throw new Error('拉取失败');
  const { conversations } = await res.json();
  let downloaded = 0;

  for (const conv of conversations) {
    // Check if already exists locally
    const localConvs = await getConversations();
    const exists = localConvs.find((c) => c.title === conv.title && Math.abs(new Date(c.createdAt).getTime() - new Date(conv.createdAt).getTime()) < 60000);
    let localId: number;

    if (exists) {
      localId = exists.id!;
      await updateConversation(localId, { tags: conv.tags, stage: conv.stage, pinned: conv.pinned });
    } else {
      localId = await createConversation(conv.title);
      await updateConversation(localId, { tags: conv.tags, stage: conv.stage, pinned: conv.pinned });
    }

    // Pull messages
    const msgRes = await fetch(`${API}/api/conversations/${conv.id}/messages`, { headers: headers() });
    if (msgRes.ok) {
      const { messages } = await msgRes.json();
      for (const msg of messages) {
        await addMessage({ conversationId: localId, role: msg.role, content: msg.content, analysis: msg.analysis });
      }
    }

    // Pull note
    const noteRes = await fetch(`${API}/api/conversations/${conv.id}/note`, { headers: headers() });
    if (noteRes.ok) {
      const { note } = await noteRes.json();
      if (note) {
        await createNote({ conversationId: localId, content: note.content });
      }
    }

    downloaded++;
  }

  return { downloaded };
}
