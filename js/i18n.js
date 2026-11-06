// App language: translated interface text, plus locale-aware dates and numbers.
// Content fetched from Wikipedia, Wikivoyage etc. stays in English.
import { STRINGS } from './i18n-strings.js';

export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en-GB' },
  { code: 'fi', name: 'Suomi', locale: 'fi-FI' },
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
  { code: 'nb', name: 'Norsk', locale: 'nb-NO' },
  { code: 'pt', name: 'Português', locale: 'pt-PT' },
  { code: 'es', name: 'Español', locale: 'es-ES' },
  { code: 'sv', name: 'Svenska', locale: 'sv-SE' },
];

const PROFILE_KEY = 'travel-advisor.profile.v1';

function pickLanguage() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}').lang;
    if (LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {}
  for (const n of navigator.languages || [navigator.language || 'en']) {
    const base = String(n).toLowerCase().split('-')[0];
    const code = base === 'no' || base === 'nn' ? 'nb' : base;
    if (LANGUAGES.some((l) => l.code === code)) return code;
  }
  return 'en';
}

export const lang = pickLanguage();
export const locale = LANGUAGES.find((l) => l.code === lang).locale;
const dict = STRINGS[lang] || STRINGS.en;

/** Translate a key, filling {placeholders}. Falls back to English, then the key. */
export function t(key, vars = {}) {
  const s = dict[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** Plural-aware translation: uses `${key}.one` / `${key}.other`. */
const plural = new Intl.PluralRules(locale);
export function tp(key, n, vars = {}) {
  const form = plural.select(n) === 'one' ? 'one' : 'other';
  return t(`${key}.${form}`, { n, ...vars });
}

/** Fill static text in the page: data-i18n (text), -html, -ph (placeholder), -aria (aria-label). */
export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
}

export const capitalize = (s) => (s ? s.charAt(0).toLocaleUpperCase(locale) + s.slice(1) : s);

/* ---------- Names in the app language ---------- */

let regionNames, languageNames, currencyNames;
export function countryName(cc, fallback = '') {
  try {
    regionNames ||= new Intl.DisplayNames([locale], { type: 'region' });
    return regionNames.of(String(cc).toUpperCase()) || fallback || cc;
  } catch {
    return fallback || cc;
  }
}

export function languageName(code1, fallback = '') {
  try {
    languageNames ||= new Intl.DisplayNames([locale], { type: 'language' });
    const n = code1 && languageNames.of(code1);
    return n && n !== code1 ? capitalize(n) : fallback;
  } catch {
    return fallback;
  }
}

export function currencyName(code) {
  try {
    currencyNames ||= new Intl.DisplayNames([locale], { type: 'currency' });
    return capitalize(currencyNames.of(code));
  } catch {
    return code;
  }
}

/* ---------- Dates and numbers ---------- */

const parse = (s) => new Date(s + 'T00:00:00');
const fmt = (opts) => new Intl.DateTimeFormat(locale, opts);
const fDay = fmt({ day: 'numeric', month: 'short' });
const fDayYear = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const fWeekday = fmt({ weekday: 'short' });
const fLong = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const fStamp = fmt({ day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const weekday = (s) => fWeekday.format(parse(s));
export const dayMonth = (s) => fDay.format(parse(s));
export const dayMonthDate = (d) => fDay.format(d);
export const longDate = (s) => fLong.format(parse(s));
export const stamp = (ms) => fStamp.format(ms);
export const dayMonthYear = (s) => fDayYear.format(parse(s));

const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
export const relative = (n, unit) => capitalize(rel.format(n, unit));

const daysFmt = new Intl.NumberFormat(locale, { style: 'unit', unit: 'day', unitDisplay: 'long' });
export const days = (n) => daysFmt.format(n);

const num1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const num0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
export const number = (n, decimals = 0) => (decimals ? num1 : num0).format(n);

const sig = new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 });
export const rateNumber = (n) => sig.format(n);

const yearsFmt = new Intl.NumberFormat(locale, { style: 'unit', unit: 'year', unitDisplay: 'long' });
export const years = (n) => yearsFmt.format(n);

const hoursFmt = new Intl.NumberFormat(locale, { style: 'unit', unit: 'hour', unitDisplay: 'long', maximumFractionDigits: 2 });
export const hours = (n) => hoursFmt.format(n);

const fDayMonthLong = fmt({ day: 'numeric', month: 'long' });
export const dayMonthLong = (s) => fDayMonthLong.format(parse(s));

/** Current time in a time zone, e.g. "16:05 Wed". */
export function clockIn(timeZone, date = new Date()) {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit', weekday: 'short' }).format(date);
  } catch {
    return '';
  }
}
