import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import AnalysisCard from './AnalysisCard';
import MindMapView from './MindMapView';
import { User, Sparkles, FileText, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  message: Message;
}

export default function MessageItem({ message }: Props) {
  const [viewMode, setViewMode] = useState<'text' | 'mindmap'>('text');
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const isUser = message.role === 'user';

  return (
    <div className={`px-4 py-4 ${isUser ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`}>
      <div className="max-w-3xl mx-auto">
        {/* Role header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1 rounded-md ${isUser ? 'bg-violet-100' : 'bg-emerald-100'}`}>
            {isUser ? (
              <User className="w-3.5 h-3.5 text-violet-600" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </div>
          <span className="text-xs font-medium text-slate-500">
            {isUser ? '你' : 'AI 助手'}
          </span>
          {!isUser && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setViewMode('text')}
                className={`p-1 rounded text-xs ${viewMode === 'text' ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}
                title="文字模式"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('mindmap')}
                className={`p-1 rounded text-xs ${viewMode === 'mindmap' ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}
                title="思维导图模式"
              >
                <GitBranch className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === 'text' ? (
          <div className="prose prose-sm prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <MindMapView content={message.content} />
        )}

        {/* Analysis card (only for assistant messages) */}
        {!isUser && message.analysis && (
          <div className="mt-3">
            <button
              onClick={() => setAnalysisOpen(!analysisOpen)}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              {analysisOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              深度分析
            </button>
            {analysisOpen && <AnalysisCard analysis={message.analysis} />}
          </div>
        )}
      </div>
    </div>
  );
}
