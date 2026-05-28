import { useState, useCallback } from 'react';
import { useSettings } from './hooks/useSettings';
import Layout from './components/Layout';
import SettingsView from './components/SettingsView';
import RandomReminder from './components/RandomReminder';

type View = 'main' | 'settings';

function App() {
  const { settings, update, loaded } = useSettings();
  const [view, setView] = useState<View>('main');

  const handleOpenSettings = useCallback(() => setView('settings'), []);
  const handleCloseSettings = useCallback(() => setView('main'), []);

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  if (!settings.apiKey) {
    return <SettingsView settings={settings} onUpdate={update} onClose={() => {}} forceSetup />;
  }

  if (view === 'settings') {
    return <SettingsView settings={settings} onUpdate={update} onClose={handleCloseSettings} />;
  }

  return (
    <>
      <Layout settings={settings} onOpenSettings={handleOpenSettings} />
      <RandomReminder />
    </>
  );
}

export default App;
