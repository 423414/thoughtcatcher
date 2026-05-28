import type { AnalysisResult } from '../types';
import { BookOpen, AlertTriangle, Eye, Target, CheckSquare } from 'lucide-react';

interface Props {
  analysis: AnalysisResult;
}

export default function AnalysisCard({ analysis }: Props) {
  return (
    <div className="mt-2 p-4 bg-white rounded-xl border border-slate-200 space-y-4 text-sm">
      {/* Summary */}
      {analysis.summary && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 mb-1">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">核心总结</span>
          </div>
          <p className="text-slate-700 text-sm">{analysis.summary}</p>
        </div>
      )}

      {/* Terms */}
      {analysis.terms.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">专业术语 & 效应</span>
          </div>
          <div className="space-y-2">
            {analysis.terms.map((t, i) => (
              <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <span className="font-medium text-amber-800">{t.term}</span>
                <span className="text-amber-400 mx-1.5">·</span>
                <span className="text-amber-600 text-xs">{t.category}</span>
                <p className="text-amber-700 text-xs mt-0.5">{t.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biases */}
      {analysis.biases.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">认知偏差提醒</span>
          </div>
          <div className="space-y-2">
            {analysis.biases.map((b, i) => (
              <div key={i} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <div className="font-medium text-red-800 text-xs">{b.bias}</div>
                <p className="text-red-600 text-xs mt-0.5">{b.description}</p>
                <p className="text-red-500 text-xs mt-0.5">建议：{b.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blind spots */}
      {analysis.blindSpots.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">盲点扫描</span>
          </div>
          <ul className="space-y-1.5">
            {analysis.blindSpots.map((bs, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-600 text-xs">
                <span className="text-violet-400 mt-0.5">•</span>
                {bs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Maturity score */}
      {analysis.maturityScore && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">成熟度评分</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '完整性', value: analysis.maturityScore.completeness },
              { label: '可行性', value: analysis.maturityScore.feasibility },
              { label: '新颖性', value: analysis.maturityScore.novelty },
              { label: '逻辑性', value: analysis.maturityScore.logic },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-lg font-bold text-violet-600">{item.value}</div>
                <div className="text-[10px] text-slate-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Todos */}
      {analysis.todos.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">下一步行动</span>
          </div>
          <ul className="space-y-1">
            {analysis.todos.map((todo, i) => (
              <li key={i} className="flex items-center gap-2 text-slate-600 text-xs">
                <input type="checkbox" className="rounded accent-violet-500" />
                {todo.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
