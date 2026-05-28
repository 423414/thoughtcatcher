import { useState, useEffect, useCallback } from 'react';
import { getAppSettings, saveAppSettings } from '../db';
import type { AppSettings } from '../types';

const defaults: AppSettings = {
  apiKey: '',
  model: 'claude-sonnet-4-6',
  maxTokens: 8000,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAppSettings().then((s) => {
      setSettings({ ...defaults, ...s });
      setLoaded(true);
    });
  }, []);

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveAppSettings(next);
  }, [settings]);

  return { settings, update, loaded };
}
