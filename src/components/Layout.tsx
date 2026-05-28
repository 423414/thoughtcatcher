import { useState, useCallback, useEffect } from 'react';
import type { Conversation, AppSettings } from '../types';
import { getConversations, createConversation, softDeleteConversation, restoreConversation, permanentDeleteConversation } from '../db';
import { pushToCloud, pullFromCloud } from '../services/sync';
import Sidebar from './Sidebar';
import ConversationView from './ConversationView';
import ReviewPanel from './ReviewPanel';
import TrashView from './TrashView';
import { BarChart3, User, LogOut, Cloud, CloudDownload } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  user: { username: string } | null;
  onLogout: () => void;
}

export default function Layout({ settings, onOpenSettings, onOpenLogin, user, onLogout }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const loadList = useCallback(async () => {
    setConversations(await getConversations());
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleNew = useCallback(async () => {
    const id = await createConversation('新想法');
    await loadList();
    setActiveId(id);
    setShowTrash(false);
    setShowReview(false);
    setSidebarOpen(false);
  }, [loadList]);

  const handleDelete = useCallback(async (id: number) => {
    await softDeleteConversation(id);
    await loadList();
    if (activeId === id) setActiveId(null);
  }, [activeId, loadList]);

  const handleTitleChange = useCallback(() => {
    loadList();
  }, [loadList]);

  const handleSelect = useCallback((id: number) => {
    setActiveId(id);
    setShowTrash(false);
    setShowReview(false);
    setSidebarOpen(false);
  }, []);

  const handlePush = async () => {
    setSyncMsg('上传中...');
    try {
      const { uploaded } = await pushToCloud();
      setSyncMsg(`已上传 ${uploaded} 个想法`);
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : '上传失败');
    }
    setTimeout(() => setSyncMsg(''), 3000);
  };

  const handlePull = async () => {
    setSyncMsg('下载中...');
    try {
      const { downloaded } = await pullFromCloud();
      await loadList();
      setSyncMsg(`已下载 ${downloaded} 个想法`);
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : '下载失败');
    }
    setTimeout(() => setSyncMsg(''), 3000);
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-indigo-50 via-white to-amber-50/30">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'}`}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelect}
          onNew={handleNew}
          onDelete={handleDelete}
          onOpenSettings={onOpenSettings}
          onShowTrash={() => { setShowTrash(true); setActiveId(null); setShowReview(false); }}
          onRefresh={loadList}
          providerName={settings.provider === 'deepseek' ? 'DeepSeek' : settings.provider === 'anthropic' ? 'Claude' : 'API'}
          modelName={settings.model || '?'}
        />

        {/* User section */}
        <div className="border-t border-slate-200 p-3 space-y-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-xs text-slate-600 px-1">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium truncate">{user.username}</span>
                <button onClick={onLogout} className="ml-auto text-slate-400 hover:text-red-500" title="退出登录">
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-1">
                <button onClick={handlePush} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-medium">
                  <Cloud className="w-3 h-3" /> 上传
                </button>
                <button onClick={handlePull} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors font-medium">
                  <CloudDownload className="w-3 h-3" /> 下载
                </button>
              </div>
              {syncMsg && <p className="text-[10px] text-center text-slate-500">{syncMsg}</p>}
            </>
          ) : (
            <button onClick={onOpenLogin} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-medium">
              <User className="w-3.5 h-3.5" /> 登录同步数据
            </button>
          )}
        </div>

        {conversations.length > 0 && (
          <button onClick={() => { setShowReview(true); setActiveId(null); setShowTrash(false); setSidebarOpen(false); }} className="m-3 p-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> 回顾简报
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {activeId ? (
          <ConversationView
            key={activeId}
            conversationId={activeId}
            settings={settings}
            onTitleChange={handleTitleChange}
            onMenuClick={() => setSidebarOpen(true)}
          />
        ) : showTrash ? (
          <TrashView onRestore={async (id) => { await restoreConversation(id); await loadList(); }} onPermanentDelete={async (id) => { await permanentDeleteConversation(id); }} onRefresh={loadList} />
        ) : showReview ? (
          <ReviewPanel conversations={conversations} settings={settings} onClose={() => setShowReview(false)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-20 h-20 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-lg">选择一个想法，或创建新的</p>
            <div className="flex gap-3 mt-4">
              <button onClick={handleNew} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">新建想法</button>
              {conversations.length > 0 && (
                <button onClick={() => setShowReview(true)} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors">回顾简报</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
