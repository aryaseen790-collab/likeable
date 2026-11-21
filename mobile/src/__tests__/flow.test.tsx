// Drives the real screens: start → answer 25 questions → result → history → settings,
// and checks that every control a person can press says what it is and what it does.
import { act, fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import path from 'node:path';

jest.mock('../lib/storage', () => {
  const mem: Record<string, unknown> = {};
  return { __mem: mem, readJSON: (k: string) => (k in mem ? mem[k] : null), writeJSON: (k: string, v: unknown) => (mem[k] = v), remove: (k: string) => delete mem[k] };
});
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///tmp/x.png') }));

const APP = path.resolve(__dirname, '../app');

/** Every pressable element must have an accessibility role and a non-empty label. */
function expectLabelledControls() {
  const all = screen.root!.queryAll((n) => typeof n.props.onClick === 'function' || typeof n.props.onResponderRelease === 'function');
  expect(all.length).toBeGreaterThan(0);
  const bad = all.filter((n) => !n.props.accessibilityRole && !n.props.role).map((n) => n.props.accessibilityLabel ?? n.props.testID ?? n.type);
  expect(bad).toEqual([]);
  const unlabelled = all.filter((n) => {
    const label = n.props.accessibilityLabel ?? n.props['aria-label'];
    return !label || !String(label).trim();
  });
  expect(unlabelled.map((n) => n.props.accessibilityRole)).toEqual([]);
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mem = require('../lib/storage').__mem as Record<string, unknown>;
beforeEach(() => {
  Object.keys(mem).forEach((k) => delete mem[k]);
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

test('take the whole test and see the result', async () => {
  await renderRouter(APP, { initialUrl: '/' });
  expect(await screen.findByText('How likeable are you?')).toBeTruthy();
  expectLabelledControls();

  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Start the Likeable Person Test' })));
  expect(screen).toHavePathname('/quiz');
  expectLabelledControls();

  for (let i = 0; i < 25; i++) {
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    await act(async () => fireEvent.press(radios[i % 4]));
    expect(screen.getAllByRole('radio')[i % 4].props.accessibilityState.checked).toBe(true);
    if (i < 24) await act(async () => jest.advanceTimersByTime(500));
  }
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Get Results' })));
  expect(screen).toHavePathnameWithParams(expect.stringMatching(/^\/result\//));
  // 4,3,2,1 repeating → 64%, the same as the website.
  expect(screen.getByLabelText(/Overall score: 64 percent/)).toBeTruthy();
  expectLabelledControls();
  expect(screen.getAllByLabelText(/^First Impressions: \d+ percent/)).toHaveLength(1);
});

test('settings: language switch flips to right-to-left and translates', async () => {
  await renderRouter(APP, { initialUrl: '/settings' });
  expectLabelledControls();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Language: English' })));
  expect(screen).toHavePathname('/language');
  expectLabelledControls();
  await act(async () => fireEvent.press(screen.getByRole('radio', { name: 'العربية' })));
  expect(screen).toHavePathname('/settings');
  expect(screen.getByText('المظهر')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'اللغة: العربية' })).toBeTruthy();
  const root = screen.root!.queryAll((n) => n.props.style && JSON.stringify(n.props.style).includes('"direction":"rtl"'));
  expect(root.length).toBeGreaterThan(0);
});

test('history is empty at first and offers to start', async () => {
  await renderRouter(APP, { initialUrl: '/history' });
  expect(screen.getByText(/No results yet/)).toBeTruthy();
  expectLabelledControls();
});
