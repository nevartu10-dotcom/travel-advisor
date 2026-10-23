// Public holidays and observances during the trip, from Nager.Date.
import { fetchJSON, remember } from './http.js';

export function getHolidays(cc, arrival, departure) {
  return remember(`holidays:${cc}:${arrival}:${departure}`, async () => {
    const years = [...new Set([arrival.slice(0, 4), departure.slice(0, 4)])];
    let covered = false;
    const all = [];
    for (const y of years) {
      try {
        const rows = await fetchJSON(`https://date.nager.at/api/v3/PublicHolidays/${y}/${cc}`);
        if (Array.isArray(rows)) {
          covered = true;
          all.push(...rows);
        }
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }
    if (!covered) return { covered: false, items: [] };
    const items = all
      .filter((h) => h.date >= arrival && h.date <= departure)
      .map((h) => ({
        date: h.date,
        localName: h.localName,
        name: h.name,
        types: h.types || [],
        regional: Array.isArray(h.counties) && h.counties.length > 0,
      }));
    return { covered: true, items };
  });
}
