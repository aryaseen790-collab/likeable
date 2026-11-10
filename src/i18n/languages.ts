// The 20 site languages (English + the 19 most-spoken languages that are widely
// used on the web). `code` is the URL prefix; `tag` the BCP 47 tag for
// lang/hreflang; `og` the Open Graph locale.
export type Lang = {
  code: string;
  tag: string;
  name: string; // native name, shown in the language switcher
  english: string;
  dir: 'ltr' | 'rtl';
  og: string;
};

export const LANGS: Lang[] = [
  { code: 'en', tag: 'en', name: 'English', english: 'English', dir: 'ltr', og: 'en_US' },
  { code: 'es', tag: 'es', name: 'Español', english: 'Spanish', dir: 'ltr', og: 'es_ES' },
  { code: 'zh', tag: 'zh-Hans', name: '简体中文', english: 'Chinese (Simplified)', dir: 'ltr', og: 'zh_CN' },
  { code: 'hi', tag: 'hi', name: 'हिन्दी', english: 'Hindi', dir: 'ltr', og: 'hi_IN' },
  { code: 'ar', tag: 'ar', name: 'العربية', english: 'Arabic', dir: 'rtl', og: 'ar_AR' },
  { code: 'bn', tag: 'bn', name: 'বাংলা', english: 'Bengali', dir: 'ltr', og: 'bn_IN' },
  { code: 'pt', tag: 'pt', name: 'Português', english: 'Portuguese', dir: 'ltr', og: 'pt_BR' },
  { code: 'ru', tag: 'ru', name: 'Русский', english: 'Russian', dir: 'ltr', og: 'ru_RU' },
  { code: 'ur', tag: 'ur', name: 'اردو', english: 'Urdu', dir: 'rtl', og: 'ur_PK' },
  { code: 'id', tag: 'id', name: 'Bahasa Indonesia', english: 'Indonesian', dir: 'ltr', og: 'id_ID' },
  { code: 'de', tag: 'de', name: 'Deutsch', english: 'German', dir: 'ltr', og: 'de_DE' },
  { code: 'ja', tag: 'ja', name: '日本語', english: 'Japanese', dir: 'ltr', og: 'ja_JP' },
  { code: 'fr', tag: 'fr', name: 'Français', english: 'French', dir: 'ltr', og: 'fr_FR' },
  { code: 'mr', tag: 'mr', name: 'मराठी', english: 'Marathi', dir: 'ltr', og: 'mr_IN' },
  { code: 'te', tag: 'te', name: 'తెలుగు', english: 'Telugu', dir: 'ltr', og: 'te_IN' },
  { code: 'tr', tag: 'tr', name: 'Türkçe', english: 'Turkish', dir: 'ltr', og: 'tr_TR' },
  { code: 'ta', tag: 'ta', name: 'தமிழ்', english: 'Tamil', dir: 'ltr', og: 'ta_IN' },
  { code: 'vi', tag: 'vi', name: 'Tiếng Việt', english: 'Vietnamese', dir: 'ltr', og: 'vi_VN' },
  { code: 'ko', tag: 'ko', name: '한국어', english: 'Korean', dir: 'ltr', og: 'ko_KR' },
  { code: 'it', tag: 'it', name: 'Italiano', english: 'Italian', dir: 'ltr', og: 'it_IT' },
];
export const DEFAULT_LANG = 'en';
export const langOf = (code: string) => LANGS.find((l) => l.code === code) ?? LANGS[0];
