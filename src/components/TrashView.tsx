import { useState, useEffect, useCallback } from 'react';
import type { Conversation } from '../types';
import { getTrashConversations } from '../db';
import { Archive, Trash2, Undo2 } from 'lucide-react';

interface Props {
  onRestore: (id: number) => Promise<void>;
  onPermanentDelete: (id: number) => void;
  onRefresh: () => void;
}

export default function TrashView({ onRestore, onPermanentDelete, onRefresh }: Props) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setItems(await getTrashConversations());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id: number) => {
    await onRestore(id);
    await load();
    onRefresh();
  };

  const handlePermanentDelete = (id: number) => {
    onPermanentDelete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setConfirmId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <Archive className="w-5 h-5 text-slate-500" />
        <h2 className="font-semibold text-slate-800">回收站</h2>
        <span className="text-xs text-slate-400 ml-2">{items.length} 个已删除的想法</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Archive className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">回收站是空的</p>
            <p className="text-xs mt-1">删除的想法会在这里保存，可以随时恢复</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700 truncate">{item.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  删除于 {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <button
                onClick={() => handleRestore(item.id!)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
              >
                <Undo2 className="w-3 h-3" /> 恢复
              </button>
              {confirmId === item.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePermanentDelete(item.id!)}
                    className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(item.id!)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> 彻底删除
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
