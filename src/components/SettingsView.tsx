import { useState, useRef } from 'react';
import type { AppSettings, AIProvider } from '../types';
import { getAppSettings } from '../db';
import { X, Key, Cpu, Zap, Server, Download, Upload, Globe } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
  onClose: () => void;
  forceSetup?: boolean;
}

const anthropicModels = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', desc: '平衡推荐 · 1M 上下文 · 日常深度分析' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7', desc: '最强分析 · 复杂推理 · 创意突破' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', desc: '轻量快速 · 简单标签 · 低成本' },
];

const deepseekModels = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat', desc: '通用对话 · 128K 上下文 · 国内直连' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', desc: '深度推理 · 复杂问题 · 思考链' },
];

const providers: { value: AIProvider; label: string; desc: string }[] = [
  { value: 'deepseek', label: 'DeepSeek', desc: '国内直连 · 性价比高' },
  { value: 'openai-compatible', label: 'OpenAI 兼容', desc: '任意兼容接口 · 灵活' },
  { value: 'anthropic', label: 'Claude', desc: '顶级分析 · 需梯子' },
];

export default function SettingsView({ settings, onUpdate, onClose, forceSetup }: Props) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [saving, setSaving] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isDeepSeek = settings.provider === 'deepseek';
  const isOpenAICompat = settings.provider === 'openai-compatible';
  const isAnthropic = settings.provider === 'anthropic';
  const models = isDeepSeek ? deepseekModels : isAnthropic ? anthropicModels : [];

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ apiKey: apiKey.trim() });
    setSaving(false);
  };

  const handleProviderChange = async (provider: AIProvider) => {
    let defaultModel: string;
    if (provider === 'deepseek') defaultModel = 'deepseek-chat';
    else if (provider === 'anthropic') defaultModel = 'claude-sonnet-4-6';
    else defaultModel = settings.model || 'gpt-4o';
    await onUpdate({ provider, model: defaultModel });
  };

  const handleExport = async () => {
    const all = await getAppSettings();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'thoughtcatcher-config.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
        provider: data.provider || settings.provider,
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
            <Zap className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-800 mb-1">欢迎使用想法捕手</h2>
            <p className="text-sm text-slate-500">请先配置 AI 服务以开始使用</p>
          </div>
        )}

        <div className="space-y-5">
          {/* Provider selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Globe className="w-4 h-4" />
              AI 服务商
            </label>
            <div className="grid grid-cols-2 gap-2">
              {providers.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleProviderChange(p.value)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    settings.provider === p.value
                      ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-800">{p.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Key className="w-4 h-4" />
              {isDeepSeek ? 'DeepSeek' : isAnthropic ? 'Claude' : ''} API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={isDeepSeek ? 'sk-...' : 'sk-ant-...'}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">
              {isDeepSeek ? (
                <>在 <a href="https://platform.deepseek.com/" target="_blank" className="text-indigo-600 hover:underline">platform.deepseek.com</a> 获取密钥</>
              ) : (
                <>在 <a href="https://console.anthropic.com/" target="_blank" className="text-indigo-600 hover:underline">console.anthropic.com</a> 获取密钥</>
              )}
            </p>
          </div>

          {/* Model selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Cpu className="w-4 h-4" />
              模型选择
            </label>
            {isOpenAICompat ? (
              <div>
                <input
                  type="text"
                  value={settings.model || ''}
                  onChange={(e) => onUpdate({ model: e.target.value.trim() })}
                  placeholder="输入模型名，如 gpt-4o, gemini-2.5-flash, qwen-plus..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
                <p className="text-xs text-slate-400 mt-1">输入你的 API 服务支持的模型名称</p>
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => onUpdate({ model: m.value })}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      settings.model === m.value
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-800">{m.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* API Proxy / Endpoint */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Server className="w-4 h-4" />
              {isOpenAICompat ? 'API 地址（必填）' : '自定义 API 地址（可选）'}
            </label>
            <input
              type="text"
              value={settings.apiProxy || ''}
              onChange={(e) => onUpdate({ apiProxy: e.target.value.trim() })}
              placeholder={
                isOpenAICompat
                  ? 'https://your-api.com/v1/chat/completions'
                  : isDeepSeek
                    ? '留空则使用 api.deepseek.com'
                    : '留空则使用 api.anthropic.com'
              }
              className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ${
                isOpenAICompat && !settings.apiProxy?.trim() ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
              }`}
            />
            <p className="text-xs text-slate-400 mt-1">
              {isOpenAICompat
                ? '填入 OpenAI 兼容的 API 端点地址'
                : '如使用中转代理，在此填入地址'}
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
          >
            {saving ? '保存中...' : forceSetup ? '开始使用' : '保存设置'}
          </button>

          <div className="flex gap-2 pt-1">
            <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> 导出配置
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <Upload className="w-4 h-4" /> 导入配置
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
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
