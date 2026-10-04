export type Language = 'en' | 'zh';

export const LANGUAGES: Language[] = ['en', 'zh'];
export const DEFAULT_LANGUAGE: Language = 'en';

// The default language is at the site root. Every other language has its own folder.
export const languageFolder = (language: Language): string => (language === DEFAULT_LANGUAGE ? '' : `${language}/`);

export const LANGUAGE_LABEL: Record<Language, string> = { en: 'English', zh: '中文' };
export const HTML_LANGUAGE_CODE: Record<Language, string> = { en: 'en', zh: 'zh-Hans' };
