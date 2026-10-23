// Top 5 recent English-language headlines about the destination country,
// from the GDELT DOC 2.0 API (no key). The list is kept within 150 words.
import { limitWords, countWords, remember } from './http.js';
import { gdelt, cleanTitle, headlineMatcher } from './gdelt.js';

export function getNews(countryName, { countryCode, city, region } = {}) {
  return remember(`news:${countryName}:${city}`, async () => {
    const data = await gdelt({ query: `"${countryName}" sourcelang:english`, maxrecords: '100', sort: 'hybridrel', timespan: '3d' });
    // Keep only headlines that are about the destination, not ones that mention it in passing.
    const isAbout = headlineMatcher({ countryName, countryCode, city, region });
    const seen = new Set();
    const items = [];
    for (const a of data?.articles || []) {
      const title = cleanTitle(a.title);
      const key = title.toLowerCase().slice(0, 60);
      if (!title || seen.has(key) || countWords(title) < 4 || !isAbout(title)) continue;
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
