// Trip card: header + nine advisory topics, each loaded independently.
import { getCard, deleteCard } from './store.js';
import { getCountry, flagEmoji } from './api/country.js';
import { getWeather } from './api/weather.js';
import { getHolidays } from './api/holidays.js';
import { getSafety } from './api/safety.js';
import { getRestaurants, getSights } from './api/places.js';
import { getNews, newsSearchUrl } from './api/news.js';
import { rankLanguages, getPhrases, PHRASE_KEYS, PHRASE_LABELS } from './api/phrases.js';
import { plugInfo, PLUG_TYPES, HOME } from './data/plugs.js';
import { forget } from './api/http.js';
import { esc, dateRange, tripLength, countdown, weekday, dayMonth, km, openSheet, closeSheet, confirmDialog, toast } from './ui.js';

const sheet = () => document.getElementById('detail-sheet');
let current = null;
let onDeleted = () => {};

export function initDetail({ deleted }) {
  onDeleted = deleted;
  sheet().addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet(sheet());
  });
}

const TOPICS = [
  ['language', '🗣️', 'Language'],
  ['weather', '🌦️', 'Weather during your trip'],
  ['plugs', '🔌', 'Power plugs'],
  ['safety', '🛡️', 'Safety'],
  ['food', '🍽️', 'Restaurants nearby'],
  ['sights', '🏛️', 'Sights nearby'],
  ['news', '📰', 'News headlines'],
  ['holidays', '🎌', 'Holidays and flag days'],
  ['phrases', '💬', 'Numbers and basic words'],
];

export function openDetail(id) {
  const card = getCard(id);
  if (!card) return;
  current = card;
  const root = document.getElementById('detail');
  root.innerHTML = `
    <div class="sheet-head detail-bar">
      <button class="icon-btn" type="button" data-close aria-label="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
      </button>
      <span class="bar-title" aria-hidden="true">${esc(card.city)}</span>
      <button class="icon-btn" type="button" data-refresh aria-label="Refresh information">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>
      </button>
    </div>
    <div class="detail-head">
      <div class="detail-title">
        <h2 id="d-city">${esc(card.city)}</h2>
        <p class="detail-country">${flagEmoji(card.countryCode)} ${esc([card.region !== card.city ? card.region : '', card.countryName].filter(Boolean).join(', '))}</p>
        <p class="detail-dates"><span>${dateRange(card.arrival, card.departure)}, ${tripLength(card.arrival, card.departure)}</span><span class="countdown">${countdown(card)}</span></p>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-inner">
        ${TOPICS.map(([key, icon, title]) => `
          <section class="topic" data-topic="${key}" aria-labelledby="t-${key}">
            <h3 id="t-${key}"><span class="h-icon" aria-hidden="true">${icon}</span>${esc(title)}</h3>
            <div class="topic-body"></div>
          </section>`).join('')}
        <div class="detail-actions">
          <button class="btn btn-quiet" type="button" data-showmap>Show on map</button>
          <button class="btn btn-danger" type="button" data-delete>Delete trip</button>
        </div>
      </div>
    </div>`;

  root.querySelector('[data-close]').addEventListener('click', () => closeSheet(sheet()));
  root.querySelector('[data-refresh]').addEventListener('click', () => {
    forget('');
    loadAll(card);
    toast('Refreshing…');
  });
  root.querySelector('[data-delete]').addEventListener('click', async () => {
    if (await confirmDialog(`Delete your trip to ${card.city}?`, 'Delete')) {
      deleteCard(card.id);
      closeSheet(sheet());
      onDeleted(card);
    }
  });
  root.querySelector('[data-showmap]').addEventListener('click', () => {
    closeSheet(sheet());
    window.dispatchEvent(new CustomEvent('focus-card', { detail: card }));
  });

  // Show the city name in the bar once the big title has scrolled away.
  const bar = root.querySelector('.detail-bar');
  new IntersectionObserver(([e]) => bar.classList.toggle('scrolled', !e.isIntersecting), { root, rootMargin: '-56px 0px 0px 0px' })
    .observe(root.querySelector('#d-city'));

  openSheet(sheet());
  root.scrollTop = 0;
  loadAll(card);
}

function body(key) {
  return document.querySelector(`#detail [data-topic="${key}"] .topic-body`);
}

const skeleton = '<div class="skeleton" aria-label="Loading"><i></i><i></i><i></i></div>';

/** Render a topic with loading state, error + retry, and a stale-card guard. */
async function section(card, key, load, render) {
  const el = body(key);
  if (!el) return;
  el.innerHTML = skeleton;
  try {
    const data = await load();
    if (current?.id !== card.id) return;
    el.innerHTML = render(data);
    el.dispatchEvent(new CustomEvent('rendered', { bubbles: true }));
  } catch (err) {
    if (current?.id !== card.id) return;
    el.innerHTML = `<p class="error">Couldn’t load this: ${esc(err.message || 'unknown error')}.</p>
      <button class="btn btn-quiet retry" type="button">Try again</button>`;
    el.querySelector('.retry').addEventListener('click', () => section(card, key, load, render));
  }
}

function loadAll(card) {
  const countryP = getCountry(card.countryCode, card.countryName);

  section(card, 'language', () => countryP, renderLanguage);
  section(card, 'weather', () => getWeather(card.lat, card.lon, card.arrival, card.departure), renderWeather);
  section(card, 'plugs', async () => plugInfo(card.countryCode), renderPlugs);
  section(
    card,
    'safety',
    async () => {
      const c = await countryP.catch(() => null);
      const names = [card.countryName, c?.name, c?.official, ...(c?.altNames || [])].filter(Boolean);
      return getSafety({ countryCode: card.countryCode, countryNames: names, city: card.city, region: card.region });
    },
    (d) => renderSafety(d, card)
  );
  section(card, 'food', () => getRestaurants(card.lat, card.lon), (d) => renderPlaces(d, 'restaurants within 1.5 km'));
  section(card, 'sights', () => getSights(card.lat, card.lon), (d) => renderPlaces(d, 'sights within 8 km'));
  section(
    card,
    'news',
    async () => {
      const c = await countryP.catch(() => null);
      return { items: await getNews(c?.name || card.countryName), name: c?.name || card.countryName };
    },
    renderNews
  );
  section(card, 'holidays', () => getHolidays(card.countryCode, card.arrival, card.departure), (d) => renderHolidays(d, card));
  loadPhrases(card, countryP);
}

/* ---------- Renderers ---------- */

function renderLanguage(c) {
  if (!c.languages.length) return '<p class="muted">No language information for this country.</p>';
  const langs = rankLanguages(c.languages);
  return `<ul class="lang-list">${langs.map((l) => `<li>${esc(l.name)}</li>`).join('')}</ul>
    <p class="source">${langs.length > 1 ? `Official and widely spoken languages in ${esc(c.name)}, most common first.` : `Official language of ${esc(c.name)}.`}</p>`;
}

function renderWeather(w) {
  const valid = w.days.filter((d) => Number.isFinite(d.max));
  if (!valid.length) return '<p class="muted">No weather data for these dates yet.</p>';
  const hi = Math.round(Math.max(...valid.map((d) => d.max)));
  const lo = Math.round(Math.min(...valid.map((d) => d.min)));
  const wet = valid.filter((d) => (d.rain ?? 0) >= 1).length;
  const lead = {
    forecast: 'Forecast',
    lastYear: 'Same dates last year',
    recorded: 'Recorded weather',
  }[w.mode];
  return `
    <p class="weather-summary"><strong>${lead}:</strong> ${lo}° to ${hi}°C, ${wet ? `rain on ${wet} of ${valid.length} days` : 'mostly dry'}.</p>
    <div class="weather-strip" role="list">
      ${w.days.map((d) => `
        <div class="wday" role="listitem" aria-label="${weekday(d.date)} ${dayMonth(d.date)}: ${d.text}, ${Math.round(d.max)}° / ${Math.round(d.min)}°">
          <b>${weekday(d.date)}</b><small>${dayMonth(d.date)}</small>
          <span class="wicon" aria-hidden="true">${d.icon}</span>
          <span class="wmax">${Number.isFinite(d.max) ? Math.round(d.max) + '°' : '–'}</span>
          <span class="wmin">${Number.isFinite(d.min) ? Math.round(d.min) + '°' : ''}</span>
          ${d.rainChance != null ? `<small>${d.rainChance}% 💧</small>` : d.rain >= 1 ? `<small>${d.rain.toFixed(0)} mm</small>` : ''}
        </div>`).join('')}
    </div>
    ${w.note ? `<p class="source">${esc(w.note)}</p>` : ''}
    <p class="source">Source: Open-Meteo.</p>`;
}

function renderPlugs(p) {
  if (!p) return '<p class="muted">No plug information for this country.</p>';
  return `
    <div class="plugs">
      ${p.types.map((t) => `<div class="plug"><span class="plug-letter" aria-hidden="true">${t}</span><span><strong>Type ${t}</strong><br><small>${esc(PLUG_TYPES[t])}</small></span></div>`).join('')}
    </div>
    <p class="verdict ${p.homePlugsFit ? 'ok' : 'warn'}">${p.homePlugsFit
      ? `✓ Plugs from ${HOME.name} (C/F) fit here.`
      : `⚠ Plugs from ${HOME.name} (C/F) don’t fit. Bring a travel adapter.`}</p>
    <p>Mains voltage: <strong>${esc(p.voltage)} V</strong>${p.lowVoltage ? '. Most phone and laptop chargers handle 100–240 V; check hair dryers and other appliances.' : '.'}</p>`;
}

function renderSafety(s, card) {
  const lvl = s.level && s.level >= 1 && s.level <= 4 ? s.level : null;
  return `
    ${lvl ? `<div class="level level-${lvl}"><span class="level-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Level ${lvl} of 4: ${esc(s.levelText)}</div>` : `<p><strong>${esc(s.levelText)}</strong></p>`}
    <p>${esc(s.text)}</p>
    ${s.areaMentioned ? '' : `<p class="muted">The advisory doesn’t single out ${esc(card.city)}; the country-wide advice applies.</p>`}
    <p class="source">Sources: ${s.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(', ')}. For Finnish travellers: <a href="https://um.fi/matkustustiedotteet" target="_blank" rel="noopener">um.fi travel advice</a>.</p>`;
}

function renderPlaces(list, scope) {
  if (!list.length) return `<p class="muted">No ${esc(scope)} found in OpenStreetMap.</p>`;
  return `
    <ol class="places">
      ${list.map((p) => `<li><span><a href="${esc(p.mapUrl)}" target="_blank" rel="noopener">${esc(p.name)}</a>${p.detail ? `<small>${esc(p.detail)}</small>` : ''}</span><span class="dist">${km(p.distance)}</span></li>`).join('')}
    </ol>
    <p class="source">From OpenStreetMap, ranked by notability and distance (no ratings available). Tap a name to see reviews in Google Maps.</p>`;
}

function renderNews({ items, name }) {
  if (!items.length) return `<p class="muted">No English-language headlines about ${esc(name)} in the last three days. <a href="${newsSearchUrl(name)}" target="_blank" rel="noopener">Search Google News</a></p>`;
  return `
    <ul class="news">
      ${items.map((n) => `<li><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a><small>${esc(n.domain || '')}</small></li>`).join('')}
    </ul>
    <p class="source">English-language coverage from the last three days, via GDELT. <a href="${newsSearchUrl(name)}" target="_blank" rel="noopener">More on Google News</a></p>`;
}

function renderHolidays(h, card) {
  if (!h.covered) return `<p class="muted">No holiday calendar available for ${esc(card.countryName)}.</p>`;
  if (!h.items.length) return `<p>No public holidays or flag days in ${esc(card.countryName)} during your trip.</p><p class="source">Source: Nager.Date.</p>`;
  return `
    <ul class="holidays">
      ${h.items.map((x) => {
        const d = new Date(x.date + 'T00:00:00');
        const kind = x.types.includes('Public') ? 'Public holiday' : x.types.includes('Observance') ? 'Observance / flag day' : x.types.join(', ');
        return `<li><span class="hdate"><b>${d.getDate()}</b><small>${weekday(x.date)}</small></span>
          <span><strong>${esc(x.localName)}</strong>${x.localName !== x.name ? ` <span class="muted">(${esc(x.name)})</span>` : ''}<br><small>${esc(kind)}${x.regional ? ', some regions only' : ''}. Shops and offices may be closed.</small></span></li>`;
      }).join('')}
    </ul>
    <p class="source">Source: Nager.Date. Flag days that aren’t public holidays may be missing.</p>`;
}

/* ---------- Phrases (interactive) ---------- */

async function loadPhrases(card, countryP) {
  const el = body('phrases');
  el.innerHTML = skeleton;
  let langs;
  try {
    const c = await countryP;
    langs = rankLanguages(c.languages);
  } catch (err) {
    if (current?.id !== card.id) return;
    el.innerHTML = `<p class="error">Couldn’t load languages: ${esc(err.message)}.</p><button class="btn btn-quiet retry" type="button">Try again</button>`;
    el.querySelector('.retry').addEventListener('click', () => loadPhrases(card, getCountry(card.countryCode, card.countryName)));
    return;
  }
  if (current?.id !== card.id) return;
  if (!langs.length) {
    el.innerHTML = '<p class="muted">No language information for this country.</p>';
    return;
  }
  const first = langs.find((l) => l.available) || langs[0];
  el.innerHTML = `
    ${langs.length > 1 ? `<div class="chips" role="group" aria-label="Language">${langs.map((l) => `<button type="button" class="chip" data-code="${esc(l.code)}" aria-pressed="false" ${l.available ? '' : 'disabled'}>${esc(l.name)}</button>`).join('')}</div>` : ''}
    <div class="phrase-body"></div>`;
  el.querySelectorAll('.chip').forEach((b) =>
    b.addEventListener('click', () => showLanguage(card, el, langs.find((l) => l.code === b.dataset.code)))
  );
  showLanguage(card, el, first);
}

async function showLanguage(card, el, lang) {
  el.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.code === lang.code)));
  const out = el.querySelector('.phrase-body');
  out.innerHTML = skeleton;
  try {
    const p = await getPhrases(lang);
    if (current?.id !== card.id) return;
    const cell = (x) => `<span>${esc(x.text)}</span>${x.roman ? `<small>${esc(x.roman)}</small>` : ''}`;
    out.innerHTML = `
      <ol class="numbers" aria-label="Numbers 1 to 10 in ${esc(p.name)}">
        ${p.numbers.map((n, i) => `<li><b>${i + 1}</b>${cell(n)}</li>`).join('')}
      </ol>
      <table class="phrases" aria-label="Basic words in ${esc(p.name)}">
        <tbody>${PHRASE_KEYS.map((k) => `<tr><th scope="row">${PHRASE_LABELS[k]}</th><td>${cell(p.phrases[k])}</td></tr>`).join('')}</tbody>
      </table>
      ${p.note ? `<p class="source">${esc(p.note)}</p>` : ''}
      <p class="source">${p.source === 'machine' ? `Machine-translated into ${esc(p.name)} by MyMemory; may be imperfect.` : `${esc(p.name)} phrasebook.`}</p>`;
  } catch (err) {
    if (current?.id !== card.id) return;
    out.innerHTML = `<p class="error">Couldn’t load ${esc(lang.name)} phrases: ${esc(err.message)}.</p><button class="btn btn-quiet retry" type="button">Try again</button>`;
    out.querySelector('.retry').addEventListener('click', () => showLanguage(card, el, lang));
  }
}

export function closeDetail() {
  closeSheet(sheet());
}
