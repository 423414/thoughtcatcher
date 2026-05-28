import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  terms?: string[];
}

export default function ColoredMarkdown({ content, terms = [] }: Props) {
  const processed = useMemo(() => {
    let text = content;

    // Highlight terms from analysis
    terms.forEach((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'g');
      text = text.replace(regex, '<hl-term>$1</hl-term>');
    });

    return text;
  }, [content, terms]);

  return (
    <div className="prose prose-sm max-w-none prose-headings:text-indigo-800 prose-headings:font-bold prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-a:text-indigo-600 prose-a:font-medium prose-strong:text-indigo-700 prose-strong:font-bold prose-em:text-amber-600 prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-blockquote:border-l-indigo-400 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: ({ children, ...props }) => (
            <strong className="text-indigo-700 font-bold bg-indigo-50 px-0.5 rounded" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="text-amber-600 font-medium not-italic bg-amber-50/50 px-0.5 rounded" {...props}>
              {children}
            </em>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-indigo-400 bg-gradient-to-r from-indigo-50 to-transparent py-2 px-4 my-3 rounded-r-xl text-slate-700"
              {...props}
            >
              {children}
            </blockquote>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md text-xs font-medium" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-slate-900 text-amber-100 p-4 rounded-xl text-xs overflow-x-auto my-3" {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children, ...props }) => (
            <h1 className="text-xl font-bold text-indigo-900 border-b-2 border-indigo-200 pb-2 mb-4" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-lg font-bold text-indigo-800 mt-5 mb-3 flex items-center gap-2" {...props}>
              <span className="w-1.5 h-5 bg-amber-400 rounded-full inline-block"></span>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-base font-semibold text-indigo-700 mt-4 mb-2" {...props}>
              {children}
            </h3>
          ),
          ul: ({ children, ...props }) => (
            <ul className="space-y-1.5 my-3" {...props}>
              {children}
            </ul>
          ),
          li: ({ children, ...props }) => (
            <li className="text-slate-700 marker:text-indigo-400" {...props}>
              {children}
            </li>
          ),
          p: ({ children, ...props }) => {
            const text = String(children);
            // Highlight inline markers like 【术语】 or 【偏差】 or 【重点】
            if (typeof text === 'string' && (text.includes('【') || text.includes('**'))) {
              return <p className="leading-relaxed mb-2" {...props}>{children}</p>;
            }
            return <p className="leading-relaxed mb-2" {...props}>{children}</p>;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
