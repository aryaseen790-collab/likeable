// The site's 20 languages (same codes and order as ../src/i18n/languages.ts; checked in i18n.test.ts).
export type Lang = { code: string; tag: string; name: string; dir: 'ltr' | 'rtl' };
export const LANGS: Lang[] = [
  { code: 'en', tag: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', tag: 'es', name: 'Español', dir: 'ltr' },
  { code: 'zh', tag: 'zh-Hans', name: '简体中文', dir: 'ltr' },
  { code: 'hi', tag: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'ar', tag: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'bn', tag: 'bn', name: 'বাংলা', dir: 'ltr' },
  { code: 'pt', tag: 'pt', name: 'Português', dir: 'ltr' },
  { code: 'ru', tag: 'ru', name: 'Русский', dir: 'ltr' },
  { code: 'ur', tag: 'ur', name: 'اردو', dir: 'rtl' },
  { code: 'id', tag: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'de', tag: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'ja', tag: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'fr', tag: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'mr', tag: 'mr', name: 'मराठी', dir: 'ltr' },
  { code: 'te', tag: 'te', name: 'తెలుగు', dir: 'ltr' },
  { code: 'tr', tag: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'ta', tag: 'ta', name: 'தமிழ்', dir: 'ltr' },
  { code: 'vi', tag: 'vi', name: 'Tiếng Việt', dir: 'ltr' },
  { code: 'ko', tag: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'it', tag: 'it', name: 'Italiano', dir: 'ltr' },
];
export const langOf = (code: string) => LANGS.find((l) => l.code === code) ?? LANGS[0];
/** Best site language for the device's preferred languages (BCP 47 tags, most preferred first). */
export function pickLanguage(preferred: string[]): string {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (LANGS.some((l) => l.code === base)) return base;
  }
  return 'en';
}
