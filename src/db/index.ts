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
  });
}

export async function getConversations(): Promise<Conversation[]> {
  return db.conversations.orderBy('updatedAt').reverse().toArray();
}

export async function updateConversation(id: number, changes: Partial<Conversation>) {
  return db.conversations.update(id, { ...changes, updatedAt: new Date() });
}

export async function deleteConversation(id: number) {
  await db.messages.where('conversationId').equals(id).delete();
  await db.notes.where('conversationId').equals(id).delete();
  return db.conversations.delete(id);
}

// === Message CRUD ===
export async function addMessage(msg: Omit<Message, 'id' | 'createdAt'>): Promise<number> {
  const id = await db.messages.add({
    ...msg,
    createdAt: new Date(),
  });
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
  model: 'claude-sonnet-4-6',
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
