import { useState } from 'react';
import type { Message } from '../types';
import AnalysisCard from './AnalysisCard';
import MindMapView from './MindMapView';
import ColoredMarkdown from './ColoredMarkdown';
import { User, Sparkles, FileText, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  message: Message;
}

export default function MessageItem({ message }: Props) {
  const [viewMode, setViewMode] = useState<'text' | 'mindmap'>('text');
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const isUser = message.role === 'user';
  const highlightTerms = message.analysis?.terms?.map((t) => t.term) || [];

  return (
    <div className={`px-4 py-4 border-b border-slate-100 ${isUser ? 'msg-user' : 'msg-ai'}`}>
      <div className="max-w-3xl mx-auto">
        {/* Role header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`p-1.5 rounded-lg ${isUser ? 'bg-indigo-100' : 'bg-amber-100'}`}>
            {isUser ? (
              <User className="w-4 h-4 text-indigo-600" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {isUser ? '你' : 'AI 助手'}
          </span>
          {!isUser && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setViewMode('text')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'text'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title="文字模式"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('mindmap')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'mindmap'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title="思维导图模式"
              >
                <GitBranch className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === 'text' ? (
          <ColoredMarkdown content={message.content} terms={highlightTerms} />
        ) : (
          <MindMapView content={message.content} />
        )}

        {/* Analysis card */}
        {!isUser && message.analysis && (
          <div className="mt-4">
            <button
              onClick={() => setAnalysisOpen(!analysisOpen)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {analysisOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              深度分析
            </button>
            {analysisOpen && <AnalysisCard analysis={message.analysis} />}
          </div>
        )}
      </div>
    </div>
  );
}
