// Safety summary (max 100 words).
//
// Main text: the "Stay safe" sections of Wikivoyage's city and country guides
// (traveller-written, CC BY-SA). Wikivoyage's API is open to web pages, so this works
// from the browser.
//
// Official advisory level: tried from the U.S. State Department and the Government of
// Canada; shown only if one of them answers (their servers may refuse direct requests
// from web pages). The section works without them.
//
// Recent safety-related headlines (GDELT) are offered separately as context. They are
// not turned into a score: news over-reports bad events, so a score would mislead.
import { fetchJSON, limitWords, countWords, remember } from './http.js';
import { headlineMatcher } from './gdelt.js';
import { searchNews } from './news.js';

/* ---------- Wikivoyage ---------- */

const WV = 'https://en.wikivoyage.org/w/api.php';

async function wvExtract(title) {
  const url = `${WV}?action=query&format=json&origin=*&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=${encodeURIComponent(title)}`;
  const data = await fetchJSON(url);
  const page = Object.values(data?.query?.pages || {})[0];
  if (!page || 'missing' in page || !page.extract) return null;
  if (/may refer to|disambiguation/i.test(page.extract.slice(0, 400))) return null;
  return { title: page.title, text: page.extract };
}

async function wvSearch(query) {
  const url = `${WV}?action=query&format=json&origin=*&list=search&srlimit=1&srsearch=${encodeURIComponent(query)}`;
  const data = await fetchJSON(url);
  return data?.query?.search?.[0]?.title || null;
}

/** Pull the level-2 "Stay safe" section out of a plain-text extract. */
export function staySafeSection(text) {
  const m = text.match(/(?:^|\n)==\s*Stay safe\s*==\s*\n([\s\S]*?)(?=\n==[^=]|$)/i);
  if (!m) return '';
  return m[1]
    .split('\n')
    .filter((line) => !/^=+.*=+$/.test(line.trim())) // drop sub-headings like "=== Crime ==="
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function wvStaySafe(titles, searchQuery) {
  for (const t of titles.filter(Boolean)) {
    const page = await wvExtract(t).catch(() => null);
    const section = page && staySafeSection(page.text);
    if (section) return { title: page.title, text: section };
  }
  if (searchQuery) {
    const found = await wvSearch(searchQuery).catch(() => null);
    if (found) {
      const page = await wvExtract(found).catch(() => null);
      const section = page && staySafeSection(page.text);
      if (section) return { title: page.title, text: section };
    }
  }
  return null;
}

const wvUrl = (title) => `https://en.wikivoyage.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}#Stay_safe`;

/* ---------- Official advisories (optional) ---------- */

const LEVEL_TEXT = { 1: 'Exercise normal precautions', 2: 'Exercise increased caution', 3: 'Reconsider travel', 4: 'Do not travel' };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

async function usLevel(names) {
  const rows = await remember('safety:us', () => fetchJSON('https://cadataapi.state.gov/api/TravelAdvisories', { timeout: 8000 }));
  const list = Array.isArray(rows) ? rows : rows?.advisories || rows?.data || [];
  const wanted = names.map(norm).filter(Boolean);
  for (const r of list) {
    const title = r.Title || r.title || '';
    const raw = r.country || title.split(' - ')[0];
    const variants = [raw, raw.replace(/\(.*?\)/g, ''), ...(raw.match(/\(([^)]+)\)/g) || []).map((x) => x.slice(1, -1))].map(norm);
    if (variants.some((v) => v && wanted.includes(v))) {
      const level = Number((title.match(/Level\s*(\d)/i) || [])[1]) || Number(r.level) || null;
      if (level) return { level, name: 'U.S. State Department', url: r.Link || r.url || 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html' };
    }
  }
  return null;
}

async function caLevel(cc) {
  const data = await remember('safety:ca', () => fetchJSON('https://data.international.gc.ca/travel-voyage/index-updated.json', { timeout: 8000 }));
  const row = data?.data?.[cc];
  const state = Number(row?.['advisory-state']);
  if (!row || !Number.isFinite(state)) return null;
  const slug = row.eng?.['url-slug'];
  return { level: state + 1, name: 'Government of Canada', url: slug ? `https://travel.gc.ca/destinations/${slug}` : 'https://travel.gc.ca/travelling/advisories' };
}

/* ---------- Public API ---------- */

function firstSentences(text, maxWords) {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  let out = '';
  for (const s of parts) {
    if (countWords(out + s) > maxWords) break;
    out += s;
  }
  return (out || limitWords(text, maxWords)).trim();
}

export function getSafety({ countryCode, countryName, countryNames, city, region }) {
  return remember(`safety:${countryCode}:${city}:${region}`, async () => {
    const [cityGuide, countryGuide, us, ca] = await Promise.allSettled([
      wvStaySafe([city, region && region !== city ? region : null], city ? `${city} ${countryName}` : null),
      wvStaySafe([countryName, ...(countryNames || [])].slice(0, 3), null),
      usLevel(countryNames || [countryName]),
      caLevel(countryCode),
    ]).then((r) => r.map((x) => (x.status === 'fulfilled' ? x.value : null)));

    const official = us || ca;
    // Don't show the same page twice (e.g. city-states like Singapore).
    const country = countryGuide && countryGuide.title !== cityGuide?.title ? countryGuide : null;
    if (!cityGuide && !country && !official) throw new Error('No safety information found for this destination');

    const levelText = official ? `Level ${official.level} of 4: ${LEVEL_TEXT[official.level]}` : '';
    let budget = 100 - countWords(levelText);
    const parts = [];
    if (cityGuide) {
      const t = firstSentences(cityGuide.text, country ? Math.round(budget * 0.6) : budget);
      parts.push({ label: cityGuide.title, text: t });
      budget -= countWords(t) + countWords(cityGuide.title);
    }
    if (country && budget > 15) {
      parts.push({ label: country.title, text: firstSentences(country.text, budget - countWords(country.title)) });
    }

    const sources = [];
    if (cityGuide) sources.push({ name: `Wikivoyage: ${cityGuide.title}`, url: wvUrl(cityGuide.title) });
    if (country) sources.push({ name: `Wikivoyage: ${country.title}`, url: wvUrl(country.title) });
    if (official) sources.push({ name: official.name, url: official.url });

    return {
      level: official?.level || null,
      levelText,
      parts,
      cityCovered: !!cityGuide,
      sources,
    };
  });
}

const SAFETY_TERMS = '(protest OR strike OR crime OR attack OR shooting OR flood OR wildfire OR earthquake OR storm OR hurricane OR typhoon OR unrest OR evacuation OR outbreak)';

/** Up to 3 recent English-language headlines about safety-related events at the destination. */
export function getSafetyHeadlines(city, countryName, { countryCode, region } = {}) {
  return remember(`safetynews:${city}:${countryName}`, async () => {
    const isAbout = headlineMatcher({ countryName, countryCode, city, region });
    const place = city && city !== countryName ? `("${city}" OR "${countryName}")` : `"${countryName}"`;
    const { items } = await searchNews({
      google: `${place} ${SAFETY_TERMS} when:7d`,
      gdeltQuery: `${place} ${SAFETY_TERMS}`,
      timespan: '7d',
      isAbout,
      max: 3,
    });
    return items.map((it) => ({ ...it, title: limitWords(it.title, 25) }));
  });
}
