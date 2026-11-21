// App state kept on the device: settings, the test in progress and past results.
// Nothing here is sent anywhere.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readJSON, remove, writeJSON } from './storage';

export type ThemePref = 'system' | 'light' | 'dark';
export type Consent = 'granted' | 'denied' | null;
export type Settings = { lang: string | null; theme: ThemePref; analytics: Consent };
export type Progress = { answers: (number | null)[]; current: number; lang: string };
export type Result = { id: string; date: string; answers: number[]; lang: string };

const KEYS = { settings: 'settings-v1', progress: 'progress-v1', results: 'results-v1' } as const;
const DEFAULT_SETTINGS: Settings = { lang: null, theme: 'system', analytics: null };
const MAX_RESULTS = 100;

type Store = {
  settings: Settings;
  progress: Progress | null;
  results: Result[];
  updateSettings(patch: Partial<Settings>): void;
  saveProgress(p: Progress | null): void;
  addResult(answers: number[], lang: string): Result;
  deleteResult(id: string): void;
  clearResults(): void;
  deleteAllData(): void;
};
const Ctx = createContext<Store | null>(null);

const isAnswerList = (a: unknown): a is number[] => Array.isArray(a) && a.every((x) => x === null || (Number.isInteger(x) && x >= 0 && x <= 3));
// Stored files are treated as untrusted input: anything malformed is dropped.
function loadResults(): Result[] {
  const raw = readJSON<unknown>(KEYS.results);
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is Result => !!r && typeof r.id === 'string' && typeof r.date === 'string' && typeof r.lang === 'string' && isAnswerList(r.answers) && !r.answers.includes(null));
}
function loadProgress(): Progress | null {
  const p = readJSON<Progress>(KEYS.progress);
  return p && isAnswerList(p.answers) && Number.isInteger(p.current) && typeof p.lang === 'string' ? p : null;
}
function loadSettings(): Settings {
  const s = readJSON<Partial<Settings>>(KEYS.settings) ?? {};
  return {
    lang: typeof s.lang === 'string' ? s.lang : null,
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    analytics: s.analytics === 'granted' || s.analytics === 'denied' ? s.analytics : null,
  };
}

let seq = 0;
const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);
  const [progress, setProgress] = useState(loadProgress);
  const [results, setResults] = useState(loadResults);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      writeJSON(KEYS.settings, next);
      return next;
    });
  }, []);
  const saveProgress = useCallback((p: Progress | null) => {
    setProgress(p);
    if (p) writeJSON(KEYS.progress, p);
    else remove(KEYS.progress);
  }, []);
  const putResults = useCallback(
    (fn: (r: Result[]) => Result[]) =>
      setResults((r) => {
        const next = fn(r);
        writeJSON(KEYS.results, next);
        return next;
      }),
    [],
  );
  const addResult = useCallback((answers: number[], lang: string) => {
    const result = { id: newId(), date: new Date().toISOString(), answers, lang };
    putResults((r) => [result, ...r].slice(0, MAX_RESULTS));
    return result;
  }, [putResults]);
  const deleteResult = useCallback((id: string) => putResults((r) => r.filter((x) => x.id !== id)), [putResults]);
  const clearResults = useCallback(() => putResults(() => []), [putResults]);
  const deleteAllData = useCallback(() => {
    Object.values(KEYS).forEach(remove);
    setSettings(DEFAULT_SETTINGS);
    setProgress(null);
    setResults([]);
  }, []);

  const value = useMemo(
    () => ({ settings, progress, results, updateSettings, saveProgress, addResult, deleteResult, clearResults, deleteAllData }),
    [settings, progress, results, updateSettings, saveProgress, addResult, deleteResult, clearResults, deleteAllData],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
};
export const useSettings = () => useStore().settings;
