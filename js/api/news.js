// News headlines, from two sources:
//  1. Google News search (English), read through rss2json.com, a free service that
//     converts the news feed into a format a web app is allowed to read.
//  2. Fallback: the GDELT DOC 2.0 API.
// Headlines that don't name the destination are dropped (see headlineMatcher).
import { fetchJSON, limitWords, countWords, remember } from './http.js';
import { gdelt, cleanTitle, headlineMatcher } from './gdelt.js';

/** Google News search → [{title, url, domain}] */
async function googleNews(q) {
  const feed = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const data = await fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`, { timeout: 15000 });
  if (data?.status !== 'ok' || !Array.isArray(data.items)) throw new Error(data?.message || 'News feed unavailable');
  return data.items.map((it) => {
    const raw = String(it.title || '');
    const cut = raw.lastIndexOf(' - ');
    return {
      title: cleanTitle(cut > 0 ? raw.slice(0, cut) : raw),
      url: it.link,
      domain: cut > 0 ? raw.slice(cut + 3).trim() : it.author || '',
    };
  });
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
 * Search news: Google News first, GDELT as fallback.
 * Returns { items, source }.
 */
export async function searchNews({ google, gdeltQuery, timespan, isAbout, max, fill }) {
  let googleErr;
  try {
    const items = pick(await googleNews(google), isAbout, max, { fill });
    if (items.length) return { items, source: 'Google News' };
  } catch (err) {
    googleErr = err;
  }
  try {
    return { items: pick(await gdeltNews(gdeltQuery, timespan), isAbout, max), source: 'GDELT' };
  } catch (err) {
    throw googleErr ? new Error('The news services are not answering right now. Try again in a minute') : err;
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
