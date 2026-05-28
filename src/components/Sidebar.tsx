import { useState, useMemo } from 'react';
import type { Conversation } from '../types';
import { togglePinConversation, updateConversation } from '../db';
import { Plus, Trash2, Settings, Lightbulb, MessageSquare, Filter, Pin, Pencil, Check, X, Archive } from 'lucide-react';

interface Props {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  onOpenSettings: () => void;
  onShowTrash: () => void;
  onRefresh: () => void;
  modelName?: string;
  providerName?: string;
}

const stageLabels: Record<string, string> = {
  inspiration: '灵感', refining: '完善中', executing: '执行中', completed: '已完成',
};

const stageColors: Record<string, string> = {
  inspiration: 'bg-amber-100 text-amber-700',
  refining: 'bg-blue-100 text-blue-700',
  executing: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-200 text-slate-500',
};

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onOpenSettings, onShowTrash, onRefresh, modelName, providerName }: Props) {
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    conversations.forEach((c) => c.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [conversations]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filterTag && !c.tags?.includes(filterTag)) return false;
      if (filterStage && c.stage !== filterStage) return false;
      return true;
    });
  }, [conversations, filterTag, filterStage]);

  const handlePin = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await togglePinConversation(id);
    onRefresh();
  };

  const startRename = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingId(conv.id!);
    setEditTitle(conv.title);
  };

  const saveRename = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await updateConversation(id, { title: editTitle.trim() });
      onRefresh();
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <>
      <div className="p-4 border-b border-indigo-200/50 bg-gradient-to-b from-indigo-950 to-indigo-900">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            想法捕手
          </h1>
          <button onClick={onOpenSettings} className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-300 hover:text-white transition-colors" title="设置">
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <button onClick={onNew} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-indigo-950 rounded-xl font-bold hover:bg-amber-400 transition-colors text-sm shadow-lg shadow-amber-500/25">
          <Plus className="w-4 h-4" /> 新建想法
        </button>
        {providerName && modelName && (
          <div className="mt-2 text-[10px] text-indigo-300 text-center opacity-70">
            {providerName} · {modelName.replace('deepseek-', '').replace('claude-', '')}
          </div>
        )}
        <div className="mt-1 text-[9px] text-indigo-400/40 text-center">v28</div>
      </div>

      {/* Filters */}
      {(allTags.length > 0 || conversations.length > 0) && (
        <div className="px-3 py-2 border-b border-indigo-100 space-y-1.5 bg-white">
          <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
            <Filter className="w-3 h-3" /> 筛选
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setFilterTag(null)} className={`text-[10px] px-1.5 py-0.5 rounded-full ${!filterTag ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>全部</button>
              {allTags.slice(0, 12).map((tag) => (
                <button key={tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)} className={`text-[10px] px-1.5 py-0.5 rounded-full truncate max-w-[80px] ${filterTag === tag ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{tag}</button>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <button onClick={() => setFilterStage(null)} className={`text-[10px] px-1.5 py-0.5 rounded ${!filterStage ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}>全部阶段</button>
            {Object.entries(stageLabels).map(([key, label]) => (
              <button key={key} onClick={() => setFilterStage(filterStage === key ? null : key)} className={`text-[10px] px-1.5 py-0.5 rounded ${filterStage === key ? stageColors[key] : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto bg-white">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">{conversations.length === 0 ? '还没有想法，点击上方按钮开始' : '没有匹配的想法'}</div>
        ) : (
          filtered.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id!)}
              className={`group px-4 py-2.5 cursor-pointer border-b border-slate-50 transition-all hover:bg-indigo-50/50 ${activeId === conv.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''} ${conv.pinned ? 'bg-amber-50/30' : ''}`}
            >
              <div className="flex items-center gap-2">
                {conv.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${conv.pinned ? 'text-amber-400' : 'text-indigo-400'}`} />

                {editingId === conv.id ? (
                  <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 text-sm border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') saveRename(e as any, conv.id!); if (e.key === 'Escape') cancelRename(e as any); }}
                    />
                    <button onClick={(e) => saveRename(e, conv.id!)} className="p-0.5 text-emerald-500 hover:bg-emerald-50 rounded"><Check className="w-3 h-3" /></button>
                    <button onClick={cancelRename} className="p-0.5 text-slate-400 hover:bg-slate-50 rounded"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <span className="flex-1 text-sm font-medium text-slate-700 truncate">{conv.title}</span>
                )}

                {/* Hover actions */}
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button onClick={(e) => handlePin(e, conv.id!)} className={`p-1 rounded hover:bg-amber-100 ${conv.pinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`} title={conv.pinned ? '取消置顶' : '置顶'}>
                    <Pin className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => startRename(e, conv)} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600" title="重命名">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); conv.id && onDelete(conv.id); }} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500" title="删除">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Tags */}
              {conv.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 ml-5">
                  {conv.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} onClick={(e) => { e.stopPropagation(); setFilterTag(tag); }} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer font-medium">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Trash button */}
      <button onClick={onShowTrash} className="m-3 p-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors text-xs">
        <Archive className="w-3.5 h-3.5" /> 回收站
      </button>
    </>
  );
}
