// On-device storage: small JSON files in the app's private documents folder.
// iOS encrypts them with Data Protection; Android keeps them in app-private storage
// (file-based encryption), and allowBackup=false keeps them out of backups.
import { File, Paths } from 'expo-file-system';

const file = (key: string) => new File(Paths.document, `${key}.json`);

export function readJSON<T>(key: string): T | null {
  try {
    const f = file(key);
    return f.exists ? (JSON.parse(f.textSync()) as T) : null;
  } catch {
    return null;
  }
}
export function writeJSON(key: string, value: unknown) {
  try {
    file(key).writeSync(JSON.stringify(value));
  } catch {}
}
export function remove(key: string) {
  try {
    const f = file(key);
    if (f.exists) f.delete();
  } catch {}
}
