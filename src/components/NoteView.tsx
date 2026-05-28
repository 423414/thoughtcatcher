import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Download } from 'lucide-react';
import { exportMarkdown } from '../utils/export';

interface Props {
  content: string;
  onClose: () => void;
}

export default function NoteView({ content, onClose }: Props) {
  const handleExport = () => {
    exportMarkdown(content, '笔记导出');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">想法笔记</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="导出 Markdown"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="prose prose-sm prose-slate max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
