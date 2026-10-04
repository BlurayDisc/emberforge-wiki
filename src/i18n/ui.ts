import { escapeHtml, Html } from '../render/html';
import { DEFAULT_LANGUAGE, type Language } from './language';
import { CHINESE } from './zh';

const TRANSLATIONS: Record<Language, Record<string, string> | null> = { en: null, zh: CHINESE };

// The build writes one language at a time and never in parallel, so the wiki text of the
// page code reads the language from here. This keeps every page function free of a language argument.
let currentLanguage: Language = DEFAULT_LANGUAGE;

export function buildInLanguage<T>(language: Language, build: () => T): T {
  const previousLanguage = currentLanguage;
  currentLanguage = language;
  try {
    return build();
  } finally {
    currentLanguage = previousLanguage;
  }
}

export const activeLanguage = (): Language => currentLanguage;

function translate(english: string): string {
  const translations = TRANSLATIONS[currentLanguage];
  if (!translations) return english;
  const translated = translations[english];
  // A text without a translation fails the build, so no English text slips into a translated page.
  if (translated === undefined) throw new Error(`No ${currentLanguage} translation for wiki text: "${english}". Add it to src/i18n/${currentLanguage}.ts.`);
  return translated;
}

type TextParameter = string | number | Html;

// The English text is the key. A {name} slot takes a value, and a translation may move the slot.
export function t(english: string, parameters: Record<string, string | number> = {}): string {
  return translate(english).replace(/\{(\w+)\}/g, (slot, name: string) => String(parameters[name] ?? slot));
}

// Same as t, but a slot may hold Html (for example a link). Plain text around it is escaped.
export function tHtml(english: string, parameters: Record<string, TextParameter>): Html {
  const pieces = translate(english).split(/(\{\w+\})/);
  const markup = pieces.map((piece) => {
    const slotName = /^\{(\w+)\}$/.exec(piece)?.[1];
    if (slotName === undefined) return escapeHtml(piece);
    const value = parameters[slotName];
    if (value === undefined) return escapeHtml(piece);
    return value instanceof Html ? value.value : escapeHtml(String(value));
  });
  return new Html(markup.join(''));
}
