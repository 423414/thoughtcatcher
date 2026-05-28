import { useState, useCallback, useEffect } from 'react';
import { useSettings } from './hooks/useSettings';
import Layout from './components/Layout';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';
import RandomReminder from './components/RandomReminder';
import UpdatePrompt from './components/UpdatePrompt';
import { getToken, logout as apiLogout } from './services/api';

type View = 'main' | 'settings' | 'login';

function App() {
  const { settings, update, loaded } = useSettings();
  const [view, setView] = useState<View>('main');
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      // Trust token without verification (avoids proxy dependency)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.username && payload.exp * 1000 > Date.now()) {
          setUser({ username: payload.username });
        } else {
          apiLogout();
        }
      } catch {
        apiLogout();
      }
    }
  }, []);

  const handleLogin = useCallback((u: { username: string }) => {
    setUser(u);
    setView('main');
  }, []);

  const handleLogout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const handleOpenSettings = useCallback(() => setView('settings'), []);
  const handleCloseSettings = useCallback(() => setView('main'), []);
  const handleOpenLogin = useCallback(() => setView('login'), []);
  const handleCloseLogin = useCallback(() => setView('main'), []);

  if (!loaded) {
    return <div className="h-full flex items-center justify-center"><div className="text-slate-400">加载中...</div></div>;
  }

  if (!settings.apiKey) {
    return <SettingsView settings={settings} onUpdate={update} onClose={() => {}} forceSetup />;
  }

  if (view === 'settings') {
    return <SettingsView settings={settings} onUpdate={update} onClose={handleCloseSettings} />;
  }

  if (view === 'login') {
    return <LoginView onLogin={handleLogin} onClose={handleCloseLogin} />;
  }

  return (
    <>
      <Layout settings={settings} onOpenSettings={handleOpenSettings} onOpenLogin={handleOpenLogin} user={user} onLogout={handleLogout} />
      <RandomReminder />
      <UpdatePrompt />
    </>
  );
}

export default App;
