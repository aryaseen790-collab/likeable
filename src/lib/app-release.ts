// The latest Android APK, as found at build time by scripts/app-release.mjs.
// null when there is no release yet: the site then shows no download button.
import fs from 'node:fs';
import path from 'node:path';

export type AppRelease = { version: string; url: string; size: number; sha256: string; minSdk: number; published: string; notes: string };

// Android API level → version name, for "Android 7.0 or newer".
const ANDROID: Record<number, string> = { 21: '5.0', 23: '6.0', 24: '7.0', 26: '8.0', 28: '9', 29: '10', 30: '11', 31: '12', 33: '13', 34: '14', 35: '15', 36: '16' };

let cached: AppRelease | null | undefined;
export function appRelease(): AppRelease | null {
  if (cached !== undefined) return cached;
  try {
    const d = JSON.parse(fs.readFileSync(path.resolve('.cache/app-release.json'), 'utf8'));
    cached = d && d.version && /^https:\/\/github\.com\//.test(d.url) ? (d as AppRelease) : null;
  } catch {
    cached = null;
  }
  return cached;
}
export const androidVersion = (sdk: number) => ANDROID[sdk] ?? ANDROID[Object.keys(ANDROID).map(Number).filter((k) => k <= sdk).pop() ?? 24];
export const megabytes = (bytes: number) => (bytes / 1048576).toFixed(1);
