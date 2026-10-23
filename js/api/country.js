// Country facts (languages, names) from restcountries.com.
import { fetchJSON, remember } from './http.js';

export function flagEmoji(cc) {
  if (!/^[A-Z]{2}$/i.test(cc || '')) return '🏳️';
  return String.fromCodePoint(...cc.toUpperCase().split('').map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function getCountry(cc) {
  return remember(`country:${cc}`, async () => {
    const url = `https://restcountries.com/v3.1/alpha/${encodeURIComponent(cc)}?fields=name,languages,altSpellings,cca2,capital,currencies`;
    const data = await fetchJSON(url);
    const c = Array.isArray(data) ? data[0] : data;
    if (!c) throw new Error('No country data');
    return {
      code: c.cca2,
      name: c.name?.common || cc,
      official: c.name?.official || '',
      altNames: c.altSpellings || [],
      capital: (c.capital || [])[0] || '',
      languages: Object.entries(c.languages || {}).map(([code, name]) => ({ code, name })),
      currencies: Object.entries(c.currencies || {}).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol })),
    };
  });
}
