// Web preview only (the store builds are iOS and Android).
const k = (key: string) => `lpt-app-${key}`;
export function readJSON<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(k(key));
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(k(key), JSON.stringify(value));
  } catch {}
}
export function remove(key: string) {
  try {
    localStorage.removeItem(k(key));
  } catch {}
}
