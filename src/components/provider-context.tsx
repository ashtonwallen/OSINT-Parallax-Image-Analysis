'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultSettings, settingsSchema, type ProviderSettings } from '@/lib/providers';
const storageKey = `parallax:provider-settings:v1:${process.env.NEXT_PUBLIC_BASE_PATH || '/'}`;
const Context = createContext<{
  settings: ProviderSettings;
  setSettings: (settings: ProviderSettings) => void;
  clearSettings: () => void;
  hydrated: boolean;
  persistenceError: string;
} | null>(null);
export function ProviderSettingsContext({ children }: { children: ReactNode }) {
  const [settings, updateSettings] = useState<ProviderSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');
  useEffect(() => {
    let active = true;
    // Restore after hydration; never write defaults over saved credentials on mount.
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) updateSettings(settingsSchema.parse(JSON.parse(saved)));
      } catch {
        setPersistenceError(
          'Saved settings could not be loaded. Re-enter them or import a config file.',
        );
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);
  function setSettings(value: ProviderSettings) {
    const parsed = settingsSchema.parse(value);
    updateSettings(parsed);
    try {
      localStorage.setItem(storageKey, JSON.stringify(parsed));
      setPersistenceError('');
    } catch {
      setPersistenceError(
        'Settings work in this tab, but browser storage is unavailable. Download a config file to keep them.',
      );
    }
  }
  function clearSettings() {
    updateSettings(defaultSettings);
    try {
      localStorage.removeItem(storageKey);
      setPersistenceError('');
    } catch {
      setPersistenceError(
        'Settings cleared from this tab, but the saved copy could not be removed. Clear this site’s browser data to remove it.',
      );
    }
  }
  return (
    <Context.Provider value={{ settings, setSettings, clearSettings, hydrated, persistenceError }}>
      {children}
    </Context.Provider>
  );
}
export function useProviderSettings() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing provider settings');
  return value;
}
