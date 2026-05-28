import { useState, useMemo } from 'react';
import { Plus, Trash2, Settings, Lightbulb, MessageSquare, Filter } from 'lucide-react';
import type { Conversation } from '../types';

interface Props {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  onOpenSettings: () => void;
}

const stageLabels: Record<string, string> = {
  inspiration: '灵感',
  refining: '完善中',
  executing: '执行中',
  completed: '已完成',
};

const stageColors: Record<string, string> = {
  inspiration: 'bg-amber-100 text-amber-700',
  refining: 'bg-blue-100 text-blue-700',
  executing: 'bg-green-100 text-green-700',
  completed: 'bg-slate-200 text-slate-500',
};

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onOpenSettings }: Props) {
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string | null>(null);

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

  return (
    <>
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-violet-600" />
            想法捕手
          </h1>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          新建想法
        </button>
      </div>

      {/* Filters */}
      {(allTags.length > 0 || conversations.length > 0) && (
        <div className="px-3 py-2 border-b border-slate-100 space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Filter className="w-3 h-3" /> 筛选
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterTag(null)}
                className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                  !filterTag ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                全部
              </button>
              {allTags.slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors truncate max-w-[80px] ${
                    filterTag === tag ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Stage filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setFilterStage(null)}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                !filterStage ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              全部阶段
            </button>
            {Object.entries(stageLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilterStage(filterStage === key ? null : key)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  filterStage === key ? stageColors[key] : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            {conversations.length === 0 ? '还没有想法，点击上方按钮开始' : '没有匹配的想法'}
          </div>
        ) : (
          filtered.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id!)}
              className={`group px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-100 ${
                activeId === conv.id ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-700 truncate">{conv.title}</span>
                  </div>
                  {conv.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {conv.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setFilterTag(tag); }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 hover:bg-violet-100 hover:text-violet-600 cursor-pointer transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                      {conv.tags.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{conv.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${stageColors[conv.stage]}`}>
                      {stageLabels[conv.stage]}
                    </span>
                    {conv.maturityScore && (
                      <span className="text-[10px] text-slate-400">
                        {Math.round(
                          (conv.maturityScore.completeness +
                            conv.maturityScore.feasibility +
                            conv.maturityScore.novelty +
                            conv.maturityScore.logic) / 4
                        ) * 10}%
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); conv.id && onDelete(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-all shrink-0"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
