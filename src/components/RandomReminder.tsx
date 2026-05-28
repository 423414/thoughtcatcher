import { useState, useEffect, useCallback } from 'react';
import type { Conversation } from '../types';
import { getConversations } from '../db';
import { Lightbulb, RefreshCw, X } from 'lucide-react';

export default function RandomReminder() {
  const [idea, setIdea] = useState<Conversation | null>(null);
  const [visible, setVisible] = useState(false);

  const pickRandom = useCallback(async () => {
    const convs = await getConversations();
    if (convs.length === 0) return;
    const random = convs[Math.floor(Math.random() * convs.length)];
    setIdea(random);
    setVisible(true);
  }, []);

  useEffect(() => {
    // Show a random idea after 30 seconds, then every 10 minutes
    const initial = setTimeout(pickRandom, 30000);
    const interval = setInterval(pickRandom, 600000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [pickRandom]);

  if (!visible || !idea) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white border border-slate-300 rounded-xl shadow-lg p-4 animate-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">还记得这个想法吗？</p>
            <p className="text-sm font-medium text-slate-800">{idea.title}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {idea.tags?.slice(0, 3).map((t, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                  {t}
                </span>
              ))}
            </div>
            {idea.maturityScore && (
              <p className="text-[10px] text-slate-400 mt-1">
                成熟度 {Math.round((idea.maturityScore.completeness + idea.maturityScore.feasibility + idea.maturityScore.novelty + idea.maturityScore.logic) / 4) * 10}%
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={pickRandom}
            className="p-1 rounded hover:bg-slate-100 text-slate-400"
            title="换一个"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setVisible(false)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400"
            title="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
