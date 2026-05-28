import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../types';
import { getMessages } from '../db';
import { Clock, MessageCircle, Sparkles, Flag, ArrowRight, X, History } from 'lucide-react';

interface Props {
  conversationId: number;
  conversationTitle: string;
  onClose: () => void;
}

export default function TimelineView({ conversationId, conversationTitle, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    getMessages(conversationId).then(setMessages);
  }, [conversationId]);

  // Extract key milestones from messages
  const milestones = messages.map((msg) => {
    const time = new Date(msg.createdAt);
    const summary = msg.content.slice(0, 150).replace(/\n/g, ' ');
    return {
      type: msg.role === 'user' ? 'input' : 'insight',
      time: `${time.getMonth() + 1}/${time.getDate()} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`,
      content: summary,
      fullContent: msg.content,
      hasAnalysis: !!msg.analysis,
      timestamp: msg.createdAt,
    };
  });

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <History className="w-4 h-4 text-violet-500" />
          想法进化轨迹
        </h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-sm font-medium text-slate-600 mb-4">{conversationTitle}</h4>

        {milestones.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">还没有对话记录</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />

            <div className="space-y-4">
              {milestones.map((m, i) => (
                <div key={i} className="relative flex gap-4 pl-10">
                  {/* Dot */}
                  <div
                    className={`absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      m.type === 'input' ? 'bg-violet-400' : 'bg-emerald-400'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.time}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          m.type === 'input'
                            ? 'bg-violet-50 text-violet-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {m.type === 'input' ? (
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> 想法</span>
                        ) : (
                          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> 洞察</span>
                        )}
                      </span>
                      {m.hasAnalysis && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-amber-50 text-amber-600 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> 分析
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 prose prose-sm max-w-none line-clamp-2">
                      <ReactMarkdown>{m.content + (m.content.length >= 150 ? '...' : '')}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {/* End dot */}
              <div className="relative flex gap-4 pl-10">
                <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-slate-400" />
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  继续进化中...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
