import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Conversation, AppSettings } from '../types';
import { generateWeeklyReview } from '../services/claude';
import { Calendar, Loader2, X, Sparkles } from 'lucide-react';

interface Props {
  conversations: Conversation[];
  settings: AppSettings;
  onClose: () => void;
}

export default function ReviewPanel({ conversations, settings, onClose }: Props) {
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateWeeklyReview(
        conversations.map((c) => ({
          title: c.title,
          summary: '',
          tags: c.tags,
          stage: c.stage,
          createdAt: c.createdAt,
        })),
        settings,
      );
      setReview(result);
    } catch (e: unknown) {
      setReview('生成失败：' + (e instanceof Error ? e.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-500" />
          回顾简报
        </h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!review && !loading && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-violet-300 mx-auto mb-4" />
            <p className="text-slate-500 text-sm mb-4">AI 会分析你所有的想法，生成一份回顾简报</p>
            <button
              onClick={handleGenerate}
              className="px-6 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors text-sm"
            >
              生成回顾简报
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在分析你的想法...</span>
          </div>
        )}

        {review && (
          <div>
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{review}</ReactMarkdown>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-4 w-full py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              重新生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
