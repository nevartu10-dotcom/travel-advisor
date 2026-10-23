// News headlines.
//  1. Google News search (English). A web app can't read Google's feed directly, so it
//     goes through a free relay; three are tried in turn:
//       rss2json.com (converts to JSON), allorigins.win and codetabs.com (pass the feed through).
//     The relays only see the search words (e.g. the country name).
//  2. Fallback: the GDELT DOC 2.0 API.
// Headlines that don't name the destination are dropped (see headlineMatcher).
import { fetchJSON, fetchText, limitWords, countWords, remember } from './http.js';
import { gdelt, cleanTitle, headlineMatcher } from './gdelt.js';

function splitSource(raw, fallback = '') {
  const cut = raw.lastIndexOf(' - ');
  return cut > 0 ? { title: cleanTitle(raw.slice(0, cut)), source: raw.slice(cut + 3).trim() } : { title: cleanTitle(raw), source: fallback };
}

function parseRss(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const items = [...doc.querySelectorAll('item')];
  if (!items.length) throw new Error('feed had no stories');
  return items.map((it) => {
    const { title, source } = splitSource(it.querySelector('title')?.textContent || '', it.querySelector('source')?.textContent || '');
    return { title, url: it.querySelector('link')?.textContent || '', domain: source };
  });
}

const RELAYS = [
  {
    name: 'rss2json.com',
    async get(feed) {
      const data = await fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`, { timeout: 12000 });
      if (data?.status !== 'ok' || !Array.isArray(data.items)) throw new Error(data?.message || 'no feed returned');
      return data.items.map((it) => {
        const { title, source } = splitSource(String(it.title || ''), it.author || '');
        return { title, url: it.link, domain: source };
      });
    },
  },
  { name: 'allorigins.win', get: async (feed) => parseRss(await fetchText(`https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`, { timeout: 12000 })) },
  { name: 'codetabs.com', get: async (feed) => parseRss(await fetchText(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(feed)}`, { timeout: 12000 })) },
];

/** Google News search → [{title, url, domain}], trying each relay in turn. */
async function googleNews(q) {
  const feed = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const reasons = [];
  for (const relay of RELAYS) {
    try {
      return await relay.get(feed);
    } catch (err) {
      reasons.push(`${relay.name}: ${err.message}`);
    }
  }
  throw new Error(reasons.join('; '));
}

async function gdeltNews(query, timespan) {
  const data = await gdelt({ query: `${query} sourcelang:english`, maxrecords: '100', sort: 'hybridrel', timespan });
  return (data?.articles || []).map((a) => ({ title: cleanTitle(a.title), url: a.url, domain: a.domain }));
}

function pick(list, isAbout, max, { fill = false } = {}) {
  const seen = new Set();
  const ok = (a) => a.title && countWords(a.title) >= 4 && !seen.has(a.title.toLowerCase().slice(0, 60));
  const out = [];
  for (const a of list) {
    if (out.length === max) break;
    if (ok(a) && isAbout(a.title)) {
      seen.add(a.title.toLowerCase().slice(0, 60));
      out.push(a);
    }
  }
  // Google's own search is already about the place, so its other results can fill gaps.
  if (fill) for (const a of list) {
    if (out.length === max) break;
    if (ok(a)) {
      seen.add(a.title.toLowerCase().slice(0, 60));
      out.push(a);
    }
  }
  return out;
}

/**
 * Search news: Google News first, GDELT as fallback (unless useGdelt is false).
 * Returns { items, source }. On failure the error lists each source's reason.
 */
export async function searchNews({ google, gdeltQuery, timespan, isAbout, max, fill, useGdelt = true }) {
  let googleReason = '';
  try {
    const items = pick(await googleNews(google), isAbout, max, { fill });
    if (items.length || !useGdelt) return { items, source: 'Google News' };
  } catch (err) {
    googleReason = err.message;
  }
  if (!useGdelt) throw new Error(`Google News unavailable (${googleReason})`);
  try {
    return { items: pick(await gdeltNews(gdeltQuery, timespan), isAbout, max), source: 'GDELT' };
  } catch (err) {
    throw new Error(googleReason ? `Google News: ${googleReason}. GDELT: ${err.message}` : err.message);
  }
}

export function getNews(countryName, { countryCode, city, region } = {}) {
  return remember(`news:${countryName}:${city}`, async () => {
    const isAbout = headlineMatcher({ countryName, countryCode, city, region });
    const { items, source } = await searchNews({
      google: `"${countryName}" when:3d`,
      gdeltQuery: `"${countryName}"`,
      timespan: '3d',
      isAbout,
      max: 5,
      fill: true,
    });
    // Keep the whole list within 150 words.
    let budget = 150;
    const trimmed = items.map((it, i) => {
      const share = Math.floor(budget / (items.length - i));
      const title = limitWords(it.title, share);
      budget -= countWords(title);
      return { ...it, title };
    });
    return { items: trimmed, source };
  });
}

export const newsSearchUrl = (countryName) => `https://news.google.com/search?q=${encodeURIComponent(countryName)}&hl=en`;
