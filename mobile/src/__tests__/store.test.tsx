// Stored files are untrusted: tampered or corrupt data must be ignored, not crash the app.
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StoreProvider, useStore } from '../lib/store';
jest.mock('../lib/storage', () => {
  const mem: Record<string, unknown> = {};
  return {
    __mem: mem,
    readJSON: (k: string) => (k in mem ? mem[k] : null),
    writeJSON: (k: string, v: unknown) => (mem[k] = JSON.parse(JSON.stringify(v))),
    remove: (k: string) => delete mem[k],
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mem = require('../lib/storage').__mem as Record<string, unknown>;
const wrapper = ({ children }: { children: ReactNode }) => <StoreProvider>{children}</StoreProvider>;

beforeEach(() => Object.keys(mem).forEach((k) => delete mem[k]));

test('drops malformed stored results and settings', async () => {
  mem['results-v1'] = [
    { id: 'ok', date: '2026-01-01T00:00:00Z', lang: 'en', answers: Array(25).fill(1) },
    { id: 'bad1', date: 'x', lang: 'en', answers: [9, 9] },
    { id: 'bad2', date: 'x', lang: 'en', answers: Array(25).fill(null) },
    'garbage',
    null,
  ];
  mem['settings-v1'] = { lang: 42, theme: 'neon', analytics: 'yes' };
  const { result } = await renderHook(() => useStore(), { wrapper });
  expect(result.current.results.map((r) => r.id)).toEqual(['ok']);
  expect(result.current.settings).toEqual({ lang: null, theme: 'system', analytics: null });
});

test('adds, deletes and wipes everything', async () => {
  const { result } = await renderHook(() => useStore(), { wrapper });
  await act(() => {
    result.current.addResult(Array(25).fill(0), 'en');
    result.current.updateSettings({ theme: 'dark', analytics: 'granted' });
    result.current.saveProgress({ answers: Array(25).fill(null), current: 3, lang: 'en' });
  });
  expect(result.current.results).toHaveLength(1);
  expect(mem['progress-v1']).toBeTruthy();
  await act(() => result.current.deleteAllData());
  expect(result.current.results).toEqual([]);
  expect(result.current.progress).toBeNull();
  expect(result.current.settings.analytics).toBeNull();
  expect(Object.keys(mem)).toEqual([]);
});
