// News about the destination, from Wikipedia (Wikimedia sites work reliably from the app).
//
//  1. "Portal:Current events" — Wikipedia's editor-curated daily summary of notable news,
//     each item linked to its original report (Reuters, AP, BBC…). The last 10 days are read
//     and items about the destination are kept.
//  2. "<year> in <country>" — Wikipedia's dated list of events for the country; fills the
//     list when Current events has too few items.
//
// These are notable events rather than every daily headline, so small countries may
// show fewer items.
import { fetchJSON, limitWords, countWords, remember } from './http.js';
import { headlineMatcher } from './match.js';

const API = 'https://en.wikipedia.org/w/api.php';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = 10;

/** Fetch the wikitext of several pages in one request → Map(title → text). */
async function wikitext(titles) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', redirects: '1',
    prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titles.join('|'),
  });
  const data = await fetchJSON(`${API}?${params}`, { timeout: 20000 });
  const out = new Map();
  for (const p of data?.query?.pages || []) {
    const text = p.revisions?.[0]?.slots?.main?.content;
    if (text) out.set(p.title, text);
  }
  // Map redirect targets back to the requested titles.
  for (const r of data?.query?.redirects || []) if (out.has(r.to)) out.set(r.from, out.get(r.to));
  for (const n of data?.query?.normalized || []) if (out.has(n.to)) out.set(n.from, out.get(n.to));
  return out;
}

/** Turn one line of wikitext into plain text, collecting the first external link as the source. */
function cleanLine(line) {
  let src = null;
  let t = line
    .replace(/<!--.*?-->/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>.*?<\/ref>/g, '')
    .replace(/<[^>]+>/g, '');
  // External links: [https://url (Reuters)] or [https://url Label]
  t = t.replace(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]*))?\]/g, (_, url, label = '') => {
    if (!src) src = { url, name: label.replace(/[()]/g, '').trim() };
    return '';
  });
  for (let i = 0; i < 3; i++) t = t.replace(/\{\{[^{}]*\}\}/g, ''); // single-line templates
  t = t
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/^[*#:;]+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { text: t, src };
}

/* ---------- Portal:Current events ---------- */

function dayTitles(n) {
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    out.push({ title: `Portal:Current events/${x.getFullYear()} ${MONTHS[x.getMonth()]} ${x.getDate()}`, date: x });
  }
  return out;
}

function parseDay(wt, date) {
  const items = [];
  const stack = []; // parent topic texts by bullet depth
  let category = '';
  for (const raw of wt.split('\n')) {
    const line = raw.trim();
    const heading = line.match(/^'''([^']+)'''$/) || line.match(/^;\s*(.+)$/);
    if (heading) {
      category = heading[1].trim();
      stack.length = 0;
      continue;
    }
    const m = line.match(/^(\*+)/);
    if (!m) continue;
    const depth = m[1].length;
    const { text, src } = cleanLine(line);
    if (!text) continue;
    stack.length = depth - 1;
    if (src) {
      items.push({ title: text, context: stack.filter(Boolean).join(' '), category, url: src.url, domain: src.name, date });
    }
    stack[depth - 1] = text;
  }
  return items;
}

const currentEvents = () =>
  remember('wiki:currentevents', async () => {
    const days = dayTitles(DAYS);
    const pages = await wikitext(days.map((d) => d.title));
    return days.flatMap((d) => (pages.has(d.title) ? parseDay(pages.get(d.title), d.date) : []));
  });

/* ---------- "<year> in <country>" ---------- */

function yearInTitles(countryName) {
  const year = new Date().getFullYear();
  return [`${year} in ${countryName}`, `${year} in the ${countryName}`];
}

function parseYearIn(wt) {
  const ev = wt.match(/==\s*Events\s*==([\s\S]*?)(?:\n==[^=]|$)/);
  if (!ev) return [];
  const now = new Date();
  const wanted = new Set([MONTHS[now.getMonth()], MONTHS[(now.getMonth() + 11) % 12]]);
  const items = [];
  let month = '';
  for (const raw of ev[1].split('\n')) {
    const line = raw.trim();
    const h = line.match(/^===+\s*([A-Za-z]+)\s*===+$/);
    if (h) {
      month = h[1];
      continue;
    }
    if (!line.startsWith('*') || !wanted.has(month)) continue;
    const { text, src } = cleanLine(line);
    // "23 October – Something happened" → keep the date for sorting, show the event.
    const dm = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s*[–-]\s*(.+)$/) || text.match(/^([A-Za-z]+)\s+(\d{1,2})\s*[–-]\s*(.+)$/);
    if (!dm) continue;
    const [day, mon, body] = /^\d/.test(dm[1]) ? [dm[1], dm[2], dm[3]] : [dm[2], dm[1], dm[3]];
    const mi = MONTHS.indexOf(mon);
    if (mi < 0) continue;
    const date = new Date(now.getFullYear(), mi, Number(day));
    if (date > now) continue;
    items.push({ title: body, context: '', category: '', url: src?.url || '', domain: src?.name || '', date });
  }
  return items.sort((a, b) => b.date - a.date);
}

const yearIn = (countryName) =>
  remember(`wiki:yearin:${countryName}`, async () => {
    const titles = yearInTitles(countryName);
    const pages = await wikitext(titles);
    const t = titles.find((x) => pages.has(x));
    return t ? { title: t, items: parseYearIn(pages.get(t)) } : { title: titles[0], items: [] };
  });

/* ---------- Public API ---------- */

const wikiUrl = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

function dedupe(list) {
  const seen = new Set();
  return list.filter((a) => {
    const k = a.title.toLowerCase().slice(0, 60);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Items about the destination from Current events + "<year> in <country>". */
async function destinationEvents({ countryName, countryCode, city, region }) {
  const isAbout = headlineMatcher({ countryName, countryCode, city, region });
  const [ce, yi] = await Promise.allSettled([currentEvents(), yearIn(countryName)]);
  if (ce.status === 'rejected' && yi.status === 'rejected') throw ce.reason;
  const fromPortal = (ce.value || []).filter((it) => isAbout(`${it.context} ${it.title}`));
  const year = yi.value || { title: yearInTitles(countryName)[0], items: [] };
  const fromYear = year.items.map((it) => ({ ...it, url: it.url || wikiUrl(year.title), domain: it.domain || 'Wikipedia' }));
  return { list: dedupe([...fromPortal, ...fromYear]), yearTitle: year.title };
}

export function getNews(countryName, { countryCode, city, region } = {}) {
  return remember(`news:${countryName}:${city}`, async () => {
    const { list } = await destinationEvents({ countryName, countryCode, city, region });
    const items = list.filter((it) => countWords(it.title) >= 4).slice(0, 5);
    // Keep the whole list within 150 words.
    let budget = 150;
    const trimmed = items.map((it, i) => {
      const share = Math.floor(budget / (items.length - i));
      const title = limitWords(it.title, share);
      budget -= countWords(title);
      return { ...it, title };
    });
    return { items: trimmed, source: 'Wikipedia' };
  });
}

const SAFETY_CATEGORIES = /armed conflicts|attacks|disasters|accidents|law and crime/i;
const SAFETY_WORDS = /\b(protest|strike|riot|unrest|crime|attack|shooting|stabbing|bomb|terror|flood|wildfire|fire|earthquake|storm|hurricane|typhoon|cyclone|heatwave|evacuat|outbreak|epidemic|landslide|eruption|curfew|state of emergency)/i;

/** Up to 3 recent safety-related events at the destination (for the safety section). */
export function getSafetyEvents({ countryName, countryCode, city, region }) {
  return remember(`safetynews:${countryName}:${city}`, async () => {
    const { list } = await destinationEvents({ countryName, countryCode, city, region });
    return list
      .filter((it) => SAFETY_CATEGORIES.test(it.category) || SAFETY_WORDS.test(`${it.context} ${it.title}`))
      .slice(0, 3)
      .map((it) => ({ ...it, title: limitWords(it.title, 30) }));
  });
}

export const newsSearchUrl = (countryName) => `https://news.google.com/search?q=${encodeURIComponent(countryName)}&hl=en`;
