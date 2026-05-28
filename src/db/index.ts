import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Conversation, Message, Note, AppSettings } from '../types';

class ThoughtCatcherDB extends Dexie {
  conversations!: Table<Conversation, number>;
  messages!: Table<Message, number>;
  notes!: Table<Note, number>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('ThoughtCatcherDB');
    this.version(2).stores({
      conversations: '++id, title, tags, stage, deleted, pinned, createdAt, updatedAt',
      messages: '++id, conversationId, role, createdAt',
      notes: '++id, conversationId, createdAt',
      settings: '&key',
    });
    this.version(1).stores({
      conversations: '++id, title, tags, stage, createdAt, updatedAt',
      messages: '++id, conversationId, role, createdAt',
      notes: '++id, conversationId, createdAt',
      settings: '&key',
    });
  }
}

export const db = new ThoughtCatcherDB();

// === Conversation CRUD ===
export async function createConversation(title: string): Promise<number> {
  return db.conversations.add({
    title,
    tags: [],
    stage: 'inspiration',
    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false,
    pinned: false,
  });
}

export async function getConversations(): Promise<Conversation[]> {
  const all = await db.conversations
    .filter((c) => !c.deleted)
    .toArray();
  // Sort: pinned first (by pinnedAt desc), then by updatedAt desc
  return all.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) {
      return (b.pinnedAt?.getTime() || 0) - (a.pinnedAt?.getTime() || 0);
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export async function getTrashConversations(): Promise<Conversation[]> {
  return db.conversations
    .filter((c) => c.deleted === true)
    .toArray();
}

export async function updateConversation(id: number, changes: Partial<Conversation>) {
  return db.conversations.update(id, { ...changes, updatedAt: new Date() });
}

export async function softDeleteConversation(id: number) {
  return db.conversations.update(id, { deleted: true, updatedAt: new Date() });
}

export async function restoreConversation(id: number) {
  return db.conversations.update(id, { deleted: false, updatedAt: new Date() });
}

export async function permanentDeleteConversation(id: number) {
  await db.messages.where('conversationId').equals(id).delete();
  await db.notes.where('conversationId').equals(id).delete();
  return db.conversations.delete(id);
}

export async function deleteConversation(id: number) {
  return softDeleteConversation(id);
}

export async function togglePinConversation(id: number) {
  const conv = await db.conversations.get(id);
  if (!conv) return;
  const pinned = !conv.pinned;
  await db.conversations.update(id, {
    pinned,
    pinnedAt: pinned ? new Date() : undefined,
    updatedAt: new Date(),
  });
}

// === Message CRUD ===
export async function addMessage(msg: Omit<Message, 'id' | 'createdAt'>): Promise<number> {
  const id = await db.messages.add({ ...msg, createdAt: new Date() });
  await db.conversations.update(msg.conversationId, { updatedAt: new Date() });
  return id;
}

export async function getMessages(conversationId: number): Promise<Message[]> {
  return db.messages.where('conversationId').equals(conversationId).sortBy('createdAt');
}

// === Note CRUD ===
export async function createNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<number> {
  return db.notes.add({ ...note, createdAt: new Date() });
}

export async function getNote(conversationId: number): Promise<Note | undefined> {
  return db.notes.where('conversationId').equals(conversationId).last();
}

export async function deleteNote(conversationId: number) {
  return db.notes.where('conversationId').equals(conversationId).delete();
}

// === Settings ===
export async function getSetting(key: string): Promise<unknown> {
  const s = await db.settings.get(key);
  return s?.value;
}

export async function setSetting(key: string, value: unknown) {
  return db.settings.put({ key, value });
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  provider: 'deepseek',
  model: 'deepseek-v4-flash',
  maxTokens: 8000,
  apiProxy: '',
};

export async function getAppSettings(): Promise<AppSettings> {
  const raw = await getSetting('app-settings');
  if (raw) return raw as AppSettings;
  return DEFAULT_SETTINGS;
}

export async function saveAppSettings(s: AppSettings) {
  return setSetting('app-settings', s);
}
