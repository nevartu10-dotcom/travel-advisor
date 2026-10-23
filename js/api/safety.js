// Safety summary (max 100 words) built from official government travel advisories:
//  - US State Department (cadataapi.state.gov) — has regional detail in its text
//  - Government of Canada (data.international.gc.ca) — fallback, country level
// Area-specific lines are sentences in the advisory that mention the destination
// city or region by name.
import { fetchJSON, limitWords, remember } from './http.js';

const US_URL = 'https://cadataapi.state.gov/api/TravelAdvisories';
const CA_URL = 'https://data.international.gc.ca/travel-voyage/index-updated.json';

const LEVEL_TEXT = {
  1: 'Exercise normal precautions',
  2: 'Exercise increased caution',
  3: 'Reconsider travel',
  4: 'Do not travel',
};

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

function htmlToText(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  doc.querySelectorAll('li, p, br, h1, h2, h3, h4').forEach((el) => el.append(' . '));
  return doc.body.textContent.replace(/\s*\.\s*\.\s*/g, '. ').replace(/\s+/g, ' ').trim();
}

function sentences(text) {
  return (text.match(/[^.!?]+[.!?]+/g) || [text]).map((s) => s.trim()).filter((s) => s.length > 3);
}

const usAll = () => remember('safety:us', () => fetchJSON(US_URL));
const caAll = () => remember('safety:ca', () => fetchJSON(CA_URL));

function findUS(rows, names) {
  const list = Array.isArray(rows) ? rows : rows?.advisories || rows?.data || [];
  const wanted = names.map(norm).filter(Boolean);
  for (const r of list) {
    const title = r.Title || r.title || '';
    const raw = r.country || title.split(' - ')[0];
    // "Turkey (Türkiye)" → also try "Turkey" and "Türkiye"
    const variants = [raw, raw.replace(/\(.*?\)/g, ''), ...(raw.match(/\(([^)]+)\)/g) || []).map((m) => m.slice(1, -1))].map(norm);
    if (variants.some((v) => v && wanted.includes(v))) {
      const level = Number((title.match(/Level\s*(\d)/i) || [])[1]) || Number(r.level) || null;
      return {
        level,
        text: htmlToText(r.Summary || r.summary || ''),
        url: r.Link || r.url || 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html',
        updated: r.Updated || r.updated || r.Published || r.published || '',
      };
    }
  }
  return null;
}

function findCA(data, cc) {
  const row = data?.data?.[cc];
  if (!row) return null;
  const state = Number(row['advisory-state']);
  const eng = row.eng || {};
  return {
    level: Number.isFinite(state) ? state + 1 : null,
    headline: eng['advisory-text'] || '',
    text: htmlToText(eng['recent-updates'] || ''),
    url: eng['url-slug'] ? `https://travel.gc.ca/destinations/${eng['url-slug']}` : 'https://travel.gc.ca/travelling/advisories',
  };
}

export function getSafety({ countryCode, countryNames, city, region }) {
  return remember(`safety:${countryCode}:${city}:${region}`, async () => {
    const [us, ca] = await Promise.allSettled([usAll(), caAll()]);
    const usHit = us.status === 'fulfilled' ? findUS(us.value, countryNames) : null;
    const caHit = ca.status === 'fulfilled' ? findCA(ca.value, countryCode) : null;
    if (!usHit && !caHit) {
      const reason = us.status === 'rejected' ? us.reason?.message : 'No advisory found for this country';
      throw new Error(reason);
    }

    const level = usHit?.level || caHit?.level || null;
    const levelText = (level && LEVEL_TEXT[level]) || caHit?.headline || 'See advisory';

    const areaTerms = [city, region].map(norm).filter((t) => t.length > 2);
    const body = usHit?.text || caHit?.text || '';
    const all = sentences(body);
    const area = all.filter((s) => areaTerms.some((t) => norm(s).includes(t)));
    const general = all.filter((s) => !area.includes(s));

    let text = '';
    if (area.length) text += `About ${city || region}: ${area.join(' ')} `;
    text += general.join(' ');
    if (!text.trim() && caHit?.headline) text = `${caHit.headline}.`;

    const sources = [];
    if (usHit) sources.push({ name: 'U.S. State Department', url: usHit.url });
    if (caHit) sources.push({ name: 'Government of Canada', url: caHit.url });

    return {
      level,
      levelText,
      areaMentioned: area.length > 0,
      text: limitWords(text.trim(), 100 - countWordsSafe(levelText)),
      sources,
    };
  });
}

function countWordsSafe(s) {
  return String(s).split(/\s+/).filter(Boolean).length + 2;
}
