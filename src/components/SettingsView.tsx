import { useState, useRef } from 'react';
import type { AppSettings } from '../types';
import { getAppSettings } from '../db';
import { X, Key, Cpu, Zap, Server, Download, Upload } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
  onClose: () => void;
  forceSetup?: boolean;
}

const models = [
  { value: 'claude-sonnet-4-6' as const, label: 'Claude Sonnet 4.6', desc: '平衡推荐 · 1M 上下文 · 日常深度分析' },
  { value: 'claude-opus-4-7' as const, label: 'Claude Opus 4.7', desc: '最强分析 · 复杂推理 · 创意突破' },
  { value: 'claude-haiku-4-5' as const, label: 'Claude Haiku 4.5', desc: '轻量快速 · 简单标签 · 低成本' },
];

export default function SettingsView({ settings, onUpdate, onClose, forceSetup }: Props) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [saving, setSaving] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ apiKey: apiKey.trim() });
    setSaving(false);
  };

  const handleExport = async () => {
    const all = await getAppSettings();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thoughtcatcher-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.apiKey) setApiKey(data.apiKey);
      await onUpdate({
        apiKey: data.apiKey || settings.apiKey,
        model: data.model || settings.model,
        maxTokens: data.maxTokens || settings.maxTokens,
        apiProxy: data.apiProxy || settings.apiProxy,
      });
      setImportMsg('配置导入成功！');
      setTimeout(() => setImportMsg(''), 3000);
    } catch {
      setImportMsg('导入失败，请检查文件格式');
      setTimeout(() => setImportMsg(''), 3000);
    }
  };

  return (
    <div className="h-full flex items-start justify-center bg-gradient-to-br from-indigo-50 via-white to-amber-50/30 p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-indigo-500/5 border border-indigo-100 p-6">
        {!forceSetup && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">设置</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        )}

        {forceSetup && (
          <div className="text-center mb-6">
            <Zap className="w-12 h-12 text-violet-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-800 mb-1">欢迎使用想法捕手</h2>
            <p className="text-sm text-slate-500">请先配置 Claude API Key 以开始使用</p>
          </div>
        )}

        <div className="space-y-5">
          {/* API Key */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Key className="w-4 h-4" />
              Claude API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">
              在 <a href="https://console.anthropic.com/" target="_blank" className="text-violet-600 hover:underline">console.anthropic.com</a> 获取密钥
            </p>
          </div>

          {/* API Proxy */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Server className="w-4 h-4" />
              API 代理地址（可选）
            </label>
            <input
              type="text"
              value={settings.apiProxy || ''}
              onChange={(e) => onUpdate({ apiProxy: e.target.value.trim() })}
              placeholder="留空则直连，或填入 https://your-proxy.com/v1/messages"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">国内用户可配置代理地址转发 API 请求</p>
          </div>

          {/* Model selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Cpu className="w-4 h-4" />
              模型选择
            </label>
            <div className="space-y-2">
              {models.map((m) => (
                <button
                  key={m.value}
                  onClick={() => onUpdate({ model: m.value })}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    settings.model === m.value
                      ? 'border-violet-400 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-800">{m.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '保存中...' : forceSetup ? '开始使用' : '保存设置'}
          </button>

          {/* Import / Export */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出配置
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              导入配置
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
          {importMsg && (
            <p className={`text-xs text-center ${importMsg.includes('成功') ? 'text-emerald-600' : 'text-red-500'}`}>
              {importMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
