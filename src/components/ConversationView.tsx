import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message, AppSettings } from '../types';
import {
  getMessages, addMessage, getConversations, updateConversation, getNote, createNote, deleteNote,
} from '../db';
import {
  chat, generateNote, generateTitle, socraticQuestion,
  generateCounterPerspective, generateHistoricalAnalogy,
  detectContradictions, findRelatedIdeas,
} from '../services/claude';
import MessageItem from './MessageItem';
import NoteView from './NoteView';
import TimelineView from './TimelineView';
import {
  Menu, FileText, Loader2, AlertCircle, MessageCircle,
  Shuffle, History, Globe, Flag, ChevronDown, Clock,
} from 'lucide-react';

interface Props {
  conversationId: number;
  settings: AppSettings;
  onTitleChange: () => void;
  onMenuClick: () => void;
}

const stageOptions = [
  { value: 'inspiration', label: '灵感碎片' },
  { value: 'refining', label: '完善中' },
  { value: 'executing', label: '执行中' },
  { value: 'completed', label: '已完成' },
] as const;

export default function ConversationView({ conversationId, settings, onTitleChange, onMenuClick }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState('');
  const [generatingNote, setGeneratingNote] = useState(false);
  const [error, setError] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteId, setNoteId] = useState<number | null>(null);
  const [convTitle, setConvTitle] = useState('');
  const [convStage, setConvStage] = useState<string>('inspiration');
  const [relatedIds, setRelatedIds] = useState<number[]>([]);
  const [contradictions, setContradictions] = useState<{ id: number; title: string; description: string }[]>([]);
  const [showActions, setShowActions] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadNote();
    loadConvData();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    setMessages(await getMessages(conversationId));
  }

  async function loadNote() {
    const note = await getNote(conversationId);
    if (note) { setNoteContent(note.content); setNoteId(note.id!); }
    else { setNoteContent(''); setNoteId(null); }
  }

  async function loadConvData() {
    const convs = await getConversations();
    const conv = convs.find((c) => c.id === conversationId);
    if (conv) { setConvTitle(conv.title); setConvStage(conv.stage); }
  }

  async function afterAIResponse(userContent: string) {
    try {
      const convs = await getConversations();
      const allSummaries = convs
        .filter((c) => c.id !== conversationId)
        .map((c) => ({
          id: c.id!,
          title: c.title,
          summary: (c as any)._lastSummary || c.title,
        }));

      const [related, contras] = await Promise.all([
        findRelatedIdeas(userContent, allSummaries, settings).catch(() => []),
        detectContradictions(userContent, allSummaries, settings).catch(() => []),
      ]);
      setRelatedIds(related);
      setContradictions(contras);
    } catch {}
  }

  const handleSend = useCallback(async (mode?: 'socratic' | 'reverse' | 'historical') => {
    if (!input.trim() || loading) return;
    const userContent = input.trim();
    setInput('');
    setError('');

    await addMessage({ conversationId, role: 'user', content: userContent });
    await loadMessages();

    if (messages.length === 0) {
      try {
        const title = await generateTitle(userContent, settings);
        await updateConversation(conversationId, { title });
        onTitleChange();
        setConvTitle(title);
      } catch {}
    }

    setLoading(true);
    setLoadingMode(mode || 'normal');
    try {
      const allMsgs = [...messages, { id: 0, conversationId, role: 'user' as const, content: userContent, createdAt: new Date() }];
      const history = allMsgs.map((m) => ({ role: m.role, content: m.content }));
      const fullHistory = [...history, { role: 'user' as const, content: userContent }];

      if (mode === 'socratic') {
        const reply = await socraticQuestion(fullHistory, settings);
        await addMessage({ conversationId, role: 'assistant', content: reply });
      } else if (mode === 'reverse') {
        const reply = await generateCounterPerspective(history, settings);
        await addMessage({ conversationId, role: 'assistant', content: '## 反向视角\n\n' + reply });
      } else if (mode === 'historical') {
        const reply = await generateHistoricalAnalogy(history, settings);
        await addMessage({ conversationId, role: 'assistant', content: '## 历史类比\n\n' + reply });
      } else {
        const { reply, analysis } = await chat(fullHistory, settings);
        await addMessage({ conversationId, role: 'assistant', content: reply, analysis: analysis || undefined });
        if (analysis?.suggestedTags?.length) {
          const convs = await getConversations();
          const conv = convs.find((c) => c.id === conversationId);
          if (conv) {
            await updateConversation(conversationId, {
              tags: [...new Set([...(conv.tags || []), ...analysis.suggestedTags])],
              maturityScore: analysis.maturityScore,
            });
          }
        }
        // Auto-detect relations
        afterAIResponse(userContent);
      }
      await loadMessages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
      setLoadingMode('');
    }
  }, [input, loading, conversationId, messages, settings, onTitleChange]);

  const handleGenerateNote = useCallback(async () => {
    if (messages.length === 0) return;
    setGeneratingNote(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const content = await generateNote(history, settings);
      setNoteContent(content);
      if (noteId) await deleteNote(conversationId);
      const newId = await createNote({ conversationId, content });
      setNoteId(newId);
      setShowNote(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setGeneratingNote(false);
    }
  }, [messages, conversationId, settings, noteId]);

  const handleStageChange = async (stage: string) => {
    setConvStage(stage);
    await updateConversation(conversationId, { stage: stage as any });
    onTitleChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const actionModes = [
    { mode: 'socratic' as const, icon: MessageCircle, label: '苏格拉底追问', desc: '不直接回答，用问题引导你深入思考' },
    { mode: 'reverse' as const, icon: Shuffle, label: '反向视角', desc: '从对立面审视你的想法' },
    { mode: 'historical' as const, icon: History, label: '历史类比', desc: '找历史上相似案例和教训' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 font-medium text-slate-800 truncate">{convTitle}</div>

          {/* Stage selector */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <Flag className="w-3 h-3" />
              {stageOptions.find((s) => s.value === convStage)?.label || '阶段'}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-28">
                  {stageOptions.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => { handleStageChange(s.value); setShowActions(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${convStage === s.value ? 'text-violet-600 font-medium' : 'text-slate-600'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleGenerateNote}
            disabled={generatingNote || messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1 text-sm rounded-lg border border-violet-300 text-violet-600 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {generatingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            笔记
          </button>
          {noteContent && (
            <button
              onClick={() => setShowNote(!showNote)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${showNote ? 'bg-violet-100 text-violet-700' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              查看
            </button>
          )}
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`p-1.5 rounded-lg transition-colors ${showTimeline ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            title="想法进化时间线"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>

        {/* Action mode bar */}
        <div className="flex gap-2 mt-2">
          {actionModes.map(({ mode, icon: Icon, label, desc }) => (
            <button
              key={mode}
              onClick={() => handleSend(mode)}
              disabled={loading || !input.trim()}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
              title={desc}
            >
              <Icon className="w-4 h-4 text-violet-500 shrink-0" />
              <div>
                <div className="text-xs font-medium">{label}</div>
                <div className="text-[10px] text-slate-400 truncate">{desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Relations alerts */}
        {(relatedIds.length > 0 || contradictions.length > 0) && (
          <div className="flex gap-2 mt-2">
            {relatedIds.length > 0 && (
              <div className="flex-1 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <Globe className="w-3 h-3 inline mr-1" />
                与 {relatedIds.length} 个之前的想法相关
              </div>
            )}
            {contradictions.length > 0 && (
              <div className="flex-1 p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                与 {contradictions.length} 个想法存在矛盾
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex">
        <div className={`flex-1 overflow-y-auto ${showNote ? 'hidden lg:block' : ''}`}>
          {messages.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-lg mb-2">开始你的想法之旅</p>
              <p className="text-sm mb-4">输入你的想法，AI 会帮你分析、深化、补充</p>
              <div className="text-xs text-slate-300 space-y-1">
                <p>普通发送 → AI 深度分析</p>
                <p>苏格拉底追问 → 用问题引导思考</p>
                <p>反向视角 → 从对立面审视</p>
                <p>历史类比 → 寻找历史案例</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))
          )}
          {loading && (
            <div className="p-4 flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                {loadingMode === 'socratic' ? 'AI 正在以苏格拉底式提问...' :
                 loadingMode === 'reverse' ? 'AI 正在生成反向视角...' :
                 loadingMode === 'historical' ? 'AI 正在搜索历史类比...' :
                 'AI 正在思考...'}
              </span>
            </div>
          )}
          {error && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {showNote && noteContent && (
          <div className="w-full lg:w-96 border-l border-slate-200 overflow-y-auto bg-white">
            <NoteView content={noteContent} onClose={() => setShowNote(false)} />
          </div>
        )}
        {showTimeline && (
          <div className="w-full lg:w-96 border-l border-slate-200 overflow-y-auto bg-white">
            <TimelineView
              conversationId={conversationId}
              conversationTitle={convTitle}
              onClose={() => setShowTimeline(false)}
            />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 shrink-0">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的想法... (Enter 发送, Shift+Enter 换行)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm shrink-0"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
