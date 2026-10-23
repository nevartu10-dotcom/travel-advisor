// Numbers 1-10 and basic phrases in the destination language.
// Curated phrasebook first; otherwise machine translation via MyMemory.
import { fetchJSON, remember } from './http.js';
import { curated, hasCurated, ISO3_TO_1, PHRASE_KEYS, PHRASE_LABELS, NUMBER_WORDS_EN } from '../data/phrasebook.js';

/** Order a country's languages so the most useful local one comes first. */
export function rankLanguages(languages) {
  const local = languages.filter((l) => l.code !== 'eng');
  const eng = languages.filter((l) => l.code === 'eng');
  const score = (l) => (hasCurated(l.code) ? 2 : ISO3_TO_1[l.code] ? 1 : 0);
  return [...local.sort((a, b) => score(b) - score(a)), ...eng].map((l) => ({
    ...l,
    available: hasCurated(l.code) || !!ISO3_TO_1[l.code] || l.code === 'eng',
  }));
}

async function translate(text, lang2) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang2}`;
  const data = await fetchJSON(url);
  const out = data?.responseData?.translatedText;
  if (!out || /MYMEMORY WARNING|INVALID/i.test(out)) throw new Error('Translation service limit reached');
  return out;
}

export function getPhrases(lang) {
  const c = curated(lang.code);
  if (c) return Promise.resolve(c);
  const lang2 = ISO3_TO_1[lang.code];
  if (!lang2) return Promise.reject(new Error(`No phrase data for ${lang.name}`));
  return remember(`phrases:${lang.code}`, async () => {
    const sources = [...NUMBER_WORDS_EN, ...PHRASE_KEYS.map((k) => PHRASE_LABELS[k])];
    const results = new Array(sources.length);
    let i = 0;
    const worker = async () => {
      while (i < sources.length) {
        const n = i++;
        results[n] = await translate(sources[n], lang2);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    return {
      code: lang.code,
      name: lang.name,
      numbers: results.slice(0, 10).map((text) => ({ text })),
      phrases: Object.fromEntries(PHRASE_KEYS.map((k, j) => [k, { text: results[10 + j] }])),
      note: null,
      source: 'machine',
    };
  });
}

export { PHRASE_KEYS, PHRASE_LABELS };
