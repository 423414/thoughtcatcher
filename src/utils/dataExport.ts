import { getConversations, getTrashConversations, getMessages, getNote, createConversation, addMessage, createNote, updateConversation } from '../db';

export async function exportAllData(): Promise<string> {
  const conversations = await getConversations();
  const trash = await getTrashConversations();
  const data: any = { conversations: [], trash: [], exportedAt: new Date().toISOString() };

  for (const conv of [...conversations, ...trash]) {
    const messages = await getMessages(conv.id!);
    const note = await getNote(conv.id!);
    data.conversations.push({
      ...conv,
      createdAt: (conv.createdAt as Date).toISOString?.() || conv.createdAt,
      updatedAt: (conv.updatedAt as Date).toISOString?.() || conv.updatedAt,
      pinnedAt: conv.pinnedAt ? ((conv.pinnedAt as Date).toISOString?.() || conv.pinnedAt) : undefined,
      messages: messages.map((m) => ({
        ...m,
        createdAt: (m.createdAt as Date).toISOString?.() || m.createdAt,
      })),
      note: note ? { ...note, createdAt: (note.createdAt as Date).toISOString?.() || note.createdAt } : null,
    });
  }

  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonStr: string): Promise<{ imported: number; restored: number }> {
  const data = JSON.parse(jsonStr);
  if (!data.conversations || !Array.isArray(data.conversations)) {
    throw new Error('数据格式无效');
  }

  const existing = await getConversations();
  let imported = 0;
  let restored = 0;

  for (const conv of data.conversations) {
    // Check if this conversation already exists (by title + created date approximate)
    const exists = existing.find((c) => c.title === conv.title);
    let localId: number;

    if (exists) {
      localId = exists.id!;
      await updateConversation(localId, {
        tags: conv.tags || [],
        stage: conv.stage || 'inspiration',
        pinned: conv.pinned || false,
        pinnedAt: conv.pinnedAt ? new Date(conv.pinnedAt) : undefined,
        maturityScore: conv.maturityScore,
        deleted: !!conv.deleted,
      });
      restored++;
    } else {
      localId = await createConversation(conv.title || '未命名');
      await updateConversation(localId, {
        tags: conv.tags || [],
        stage: conv.stage || 'inspiration',
        pinned: conv.pinned || false,
        pinnedAt: conv.pinnedAt ? new Date(conv.pinnedAt) : undefined,
        maturityScore: conv.maturityScore,
        deleted: !!conv.deleted,
      });
      imported++;
    }

    // Import messages
    if (conv.messages) {
      for (const msg of conv.messages) {
        await addMessage({
          conversationId: localId,
          role: msg.role,
          content: msg.content,
          analysis: msg.analysis,
        });
      }
    }

    // Import note
    if (conv.note) {
      await createNote({
        conversationId: localId,
        content: conv.note.content,
      });
    }
  }

  return { imported, restored };
}
