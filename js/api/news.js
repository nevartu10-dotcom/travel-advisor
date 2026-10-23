// Top 5 recent English-language headlines about the destination country,
// from the GDELT DOC 2.0 API (no key). The list is kept within 150 words.
import { fetchJSON, limitWords, countWords, remember } from './http.js';

function clean(title) {
  return String(title || '')
    .replace(/\s+[-|–]\s+[^-|–]{2,40}$/, '') // drop " - Site Name" tails
    .replace(/\s+/g, ' ')
    .trim();
}

export function getNews(countryName) {
  return remember(`news:${countryName}`, async () => {
    const query = `"${countryName}" sourcelang:english`;
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=40&format=json&sort=hybridrel&timespan=3d`;
    const data = await fetchJSON(url, { timeout: 20000 });
    const seen = new Set();
    const items = [];
    for (const a of data?.articles || []) {
      const title = clean(a.title);
      const key = title.toLowerCase().slice(0, 60);
      if (!title || seen.has(key) || countWords(title) < 4) continue;
      seen.add(key);
      items.push({ title, url: a.url, domain: a.domain, date: a.seendate });
      if (items.length === 5) break;
    }
    // Keep the whole list within 150 words.
    let budget = 150;
    return items.map((it, i) => {
      const share = Math.floor(budget / (items.length - i));
      const title = limitWords(it.title, share);
      budget -= countWords(title);
      return { ...it, title };
    });
  });
}

export const newsSearchUrl = (countryName) => `https://news.google.com/search?q=${encodeURIComponent(countryName)}&hl=en`;
