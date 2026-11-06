// Live country facts: exchange rate, independence/national day, time zone.
import { fetchJSON, remember } from './http.js';

/* ---------- Exchange rate ---------- */

// 1. Frankfurter: official European Central Bank reference rates (~30 major currencies).
// 2. Fallback: fawazahmed0 currency-api, a free daily dataset (~200 currencies) on jsDelivr.
async function frankfurter(from, to) {
  const d = await fetchJSON(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`, { timeout: 10000 });
  const rate = d?.rates?.[to];
  if (!Number.isFinite(rate)) throw new Error('not covered');
  return { rate, date: d.date, source: 'European Central Bank, via Frankfurter' };
}

async function currencyApi(from, to) {
  const f = from.toLowerCase();
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${f}.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${f}.json`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const d = await fetchJSON(url, { timeout: 10000 });
      const rate = d?.[f]?.[to.toLowerCase()];
      if (!Number.isFinite(rate)) throw new Error('not covered');
      return { rate, date: d.date, source: 'currency-api' };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/** How many `to` you get for 1 `from`. */
export function getRate(from, to) {
  return remember(`fx:${from}:${to}`, async () => {
    try {
      return await frankfurter(from, to);
    } catch {
      return currencyApi(from, to);
    }
  });
}

/* ---------- Independence / national day (from Nager.Date holidays) ---------- */

const INDEPENDENCE = /independence/i;
const NATIONAL = /national day|unity day|constitution day|bastille|republic day|statehood|foundation day|portugal day|national holiday|liberation day|revolution day|freedom day/i;

export function getNationalDay(cc) {
  return remember(`nationalday:${cc}`, async () => {
    const year = new Date().getFullYear();
    let rows;
    try {
      rows = await fetchJSON(`https://date.nager.at/api/v3/PublicHolidays/${year}/${cc}`);
    } catch (err) {
      if (err.status === 404) return { covered: false };
      throw err;
    }
    if (!Array.isArray(rows)) return { covered: false };
    const nationwide = rows.filter((h) => !h.counties || !h.counties.length);
    const pick = (re) => nationwide.find((h) => re.test(h.name)) || nationwide.find((h) => re.test(h.localName));
    const indep = pick(INDEPENDENCE);
    if (indep) return { covered: true, kind: 'independence', date: indep.date, name: indep.name, localName: indep.localName };
    const nat = pick(NATIONAL);
    if (nat) return { covered: true, kind: 'national', date: nat.date, name: nat.name, localName: nat.localName };
    return { covered: true, kind: null };
  });
}

/* ---------- Time zone ---------- */

/** IANA time zone for a location (Open-Meteo works it out from the coordinates). */
export function getTimeZone(lat, lon) {
  return remember(`tz:${lat.toFixed(2)},${lon.toFixed(2)}`, async () => {
    const d = await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=1&daily=weather_code`);
    if (!d?.timezone) throw new Error('no time zone');
    return d.timezone;
  });
}

/** UTC offset of a time zone at a given moment, in minutes. */
export function offsetMinutes(timeZone, date = new Date()) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((p) => p.type === 'timeZoneName')?.value || 'GMT';
    const m = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
  } catch {
    return 0;
  }
}
