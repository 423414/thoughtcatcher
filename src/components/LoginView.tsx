import { useState } from 'react';
import { login, register } from '../services/api';
import { Lightbulb, Loader2 } from 'lucide-react';

interface Props {
  onLogin: (user: { username: string }) => void;
  onClose?: () => void;
}

export default function LoginView({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const user = isRegister
        ? await register(username.trim(), password.trim())
        : await login(username.trim(), password.trim());
      onLogin(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-amber-50/30 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-indigo-500/5 border border-indigo-100 p-6">
        <div className="text-center mb-6">
          <Lightbulb className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-800">想法捕手</h1>
          <p className="text-sm text-slate-500 mt-1">登录后数据自动云端同步</p>
        </div>

        <div className="space-y-4">
          <input
            type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名" autoComplete="username"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="密码" autoComplete={isRegister ? 'new-password' : 'current-password'}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-lg shadow-indigo-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isRegister ? '注册' : '登录'}
          </button>

          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="w-full text-xs text-indigo-500 hover:text-indigo-700"
          >
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    </div>
  );
}
