import { useState, useCallback, useEffect } from 'react';
import type { Conversation, AppSettings } from '../types';
import { getConversations, createConversation, deleteConversation } from '../db';
import Sidebar from './Sidebar';
import ConversationView from './ConversationView';
import ReviewPanel from './ReviewPanel';
import { BarChart3 } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onOpenSettings: () => void;
}

export default function Layout({ settings, onOpenSettings }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showReview, setShowReview] = useState(false);

  const loadList = useCallback(async () => {
    setConversations(await getConversations());
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleNew = useCallback(async () => {
    const id = await createConversation('新想法');
    await loadList();
    setActiveId(id);
    setSidebarOpen(false);
  }, [loadList]);

  const handleDelete = useCallback(async (id: number) => {
    await deleteConversation(id);
    await loadList();
    if (activeId === id) setActiveId(null);
  }, [activeId, loadList]);

  const handleTitleChange = useCallback(() => {
    loadList();
  }, [loadList]);

  return (
    <div className="h-full flex bg-gradient-to-br from-indigo-50 via-white to-amber-50/30">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
        }`}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
          onNew={handleNew}
          onDelete={handleDelete}
          onOpenSettings={onOpenSettings}
          providerName={settings.provider === 'deepseek' ? 'DeepSeek' : settings.provider === 'anthropic' ? 'Claude' : 'API'}
          modelName={settings.model || '?'}
        />
        {conversations.length > 0 && (
          <button
            onClick={() => { setShowReview(true); setSidebarOpen(false); }}
            className="m-3 p-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-xs"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            回顾简报
          </button>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeId ? (
          <ConversationView
            key={activeId}
            conversationId={activeId}
            settings={settings}
            onTitleChange={handleTitleChange}
            onMenuClick={() => setSidebarOpen(true)}
          />
        ) : showReview ? (
          <ReviewPanel
            conversations={conversations}
            settings={settings}
            onClose={() => setShowReview(false)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-20 h-20 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-lg">选择一个想法，或创建新的</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleNew}
                className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
              >
                新建想法
              </button>
              {conversations.length > 0 && (
                <button
                  onClick={() => setShowReview(true)}
                  className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  回顾简报
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
