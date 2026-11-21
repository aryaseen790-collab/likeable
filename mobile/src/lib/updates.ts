// "Check for updates" for the APK downloaded from the website (store builds update
// through the store and don't show this). Runs only when the person taps the
// button: one request to GitHub's public API, with nothing about the person in it.
import Constants from 'expo-constants';

export const isApkBuild = process.env.EXPO_PUBLIC_DISTRIBUTION === 'apk';
const API = 'https://api.github.com/repos/aryaseen790-collab/likeable/releases?per_page=20';

const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10));
export function newer(a: string, b: string) {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}

export type UpdateCheck = { current: string; latest: string; available: boolean };
export async function checkForUpdate(): Promise<UpdateCheck> {
  const current = Constants.expoConfig?.version ?? '0.0.0';
  const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = (await res.json()) as { tag_name: string; draft: boolean; prerelease: boolean }[];
  const latest = list.map((r) => (!r.draft && !r.prerelease ? /^app-v(\d+\.\d+\.\d+)$/.exec(r.tag_name)?.[1] : undefined)).find(Boolean);
  if (!latest) return { current, latest: current, available: false };
  return { current, latest, available: newer(latest, current) };
}
