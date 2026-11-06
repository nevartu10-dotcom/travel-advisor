// Trip card: header + nine advisory topics, each loaded independently.
import { getCard, deleteCard, updateCard } from './store.js';
import { getCountry, flagEmoji } from './api/country.js';
import { getWeather } from './api/weather.js';
import { getHolidays } from './api/holidays.js';
import { getSafety, getSafetyHeadlines } from './api/safety.js';
import { getRestaurants } from './api/places.js';
import { getSights } from './api/sights.js';
import { getNews, newsSearchUrl } from './api/news.js';
import { rankLanguages, getPhrases, PHRASE_KEYS } from './api/phrases.js';
import { plugInfo } from './data/plugs.js';
import { plugArt } from './data/plug-art.js';
import { forget } from './api/http.js';
import { tripTitle, tripLabel, esc, dateRange, tripLength, countdown, weekday, dayMonth, km, openSheet, closeSheet, confirmDialog, toast, isPast } from './ui.js';
import { t, countryName, languageName, longDate, dayMonthDate } from './i18n.js';
import { getProfile, passportStatus } from './profile.js';

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
  ['language', '🗣️'],
  ['weather', '🌦️'],
  ['plugs', '🔌'],
  ['safety', '🛡️'],
  ['food', '🍽️'],
  ['sights', '🏛️'],
  ['news', '📰'],
  ['holidays', '🎌'],
  ['phrases', '💬'],
];

// Official travel advice from the user's home country, where we know the page.
const HOME_ADVICE = {
  FI: 'https://um.fi/matkustustiedotteet',
  SE: 'https://www.regeringen.se/uds-reseinformation/',
  NO: 'https://www.regjeringen.no/no/tema/utenrikssaker/reiseinformasjon/',
  DK: 'https://um.dk/rejse-og-ophold/rejse-til-udlandet/rejsevejledninger',
  DE: 'https://www.auswaertiges-amt.de/de/ReiseUndSicherheit/reise-und-sicherheitshinweise',
  FR: 'https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/',
  GB: 'https://www.gov.uk/foreign-travel-advice',
  US: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html',
  CA: 'https://travel.gc.ca/travelling/advisories',
};

const cname = (card) => countryName(card.countryCode, card.countryName);

export function openDetail(id) {
  const card = getCard(id);
  if (!card) return;
  current = card;
  const profile = getProfile();
  const pass = isPast(card) ? null : passportStatus(profile, card);
  const root = document.getElementById('detail');
  root.innerHTML = `
    <div class="sheet-head detail-bar">
      <button class="icon-btn" type="button" data-close aria-label="${esc(t('close'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
      </button>
      <span class="bar-title" aria-hidden="true">${esc(tripTitle(card))}</span>
      <button class="icon-btn" type="button" data-refresh aria-label="${esc(t('detail.refresh'))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>
      </button>
    </div>
    <div class="detail-head">
      <div class="detail-title">
        <div class="trip-name" id="d-name"></div>
        <h2 id="d-city">${esc(card.city)}</h2>
        <p class="detail-country">${flagEmoji(card.countryCode)} ${esc([card.region !== card.city ? card.region : '', cname(card)].filter(Boolean).join(', '))}</p>
        <p class="detail-dates"><span>${dateRange(card.arrival, card.departure)}, ${tripLength(card.arrival, card.departure)}</span><span class="countdown">${countdown(card)}</span></p>
      </div>
    </div>
    <div class="detail-body">
      <div class="detail-inner">
        ${pass ? `
          <section class="topic passport passport-${pass}" aria-labelledby="t-passport">
            <h3 id="t-passport"><span class="h-icon" aria-hidden="true">🛂</span>${esc(t('topic.passport'))}</h3>
            <p class="verdict ${pass === 'ok' ? 'ok' : 'warn'}">${esc(t(`pass.trip.${pass}`, { date: longDate(profile.passportExpiry), country: cname(card) }))}</p>
          </section>` : ''}
        ${TOPICS.map(([key, icon]) => `
          <section class="topic" data-topic="${key}" aria-labelledby="t-${key}">
            <h3 id="t-${key}"><span class="h-icon" aria-hidden="true">${icon}</span>${esc(t(`topic.${key}`))}</h3>
            <div class="topic-body"></div>
          </section>`).join('')}
        <section class="topic notes" aria-labelledby="t-notes">
          <h3 id="t-notes"><span class="h-icon" aria-hidden="true">📝</span>${esc(t('topic.notes'))}</h3>
          <label class="visually-hidden" for="d-notes">${esc(t('notes.label'))}</label>
          <textarea id="d-notes" rows="6" placeholder="${esc(t('notes.ph'))}">${esc(card.notes || '')}</textarea>
          <p class="notes-meta"><span id="d-notes-count"></span><span id="d-notes-status" aria-live="polite"></span></p>
        </section>
        <div class="detail-actions">
          <button class="btn btn-quiet" type="button" data-showmap>${esc(t('detail.showMap'))}</button>
          <button class="btn btn-danger" type="button" data-delete>${esc(t('detail.delete'))}</button>
        </div>
      </div>
    </div>`;

  root.querySelector('[data-close]').addEventListener('click', () => closeSheet(sheet()));
  root.querySelector('[data-refresh]').addEventListener('click', () => {
    forget('');
    loadAll(card);
    toast(t('toast.refreshing'));
  });
  root.querySelector('[data-delete]').addEventListener('click', async () => {
    if (await confirmDialog(t('detail.confirmDelete', { city: card.city }), t('confirm.delete'))) {
      deleteCard(card.id);
      closeSheet(sheet());
      onDeleted(card);
    }
  });
  root.querySelector('[data-showmap]').addEventListener('click', () => {
    closeSheet(sheet());
    window.dispatchEvent(new CustomEvent('focus-card', { detail: card }));
  });

  renderName(card);
  initNotes(card);

  // Show the city name in the bar once the big title has scrolled away.
  const bar = root.querySelector('.detail-bar');
  new IntersectionObserver(([e]) => bar.classList.toggle('scrolled', !e.isIntersecting), { root, rootMargin: '-56px 0px 0px 0px' })
    .observe(root.querySelector('#d-city'));

  openSheet(sheet());
  root.scrollTop = 0;
  loadAll(card);
}

/* ---------- Notes ---------- */

export const NOTES_MAX_WORDS = 500;
const wordCount = (t) => (t.match(/\S+/g) || []).length;

/** Keep the first `max` words, preserving the user's own spacing and line breaks. */
function cutToWords(text, max) {
  const m = text.match(new RegExp(`^\\s*(?:\\S+\\s+){${max - 1}}\\S+`));
  return m ? m[0] : text;
}

function initNotes(card) {
  const area = document.getElementById('d-notes');
  const count = document.getElementById('d-notes-count');
  const status = document.getElementById('d-notes-status');
  let timer;

  const grow = () => {
    area.style.height = 'auto';
    area.style.height = Math.max(area.scrollHeight, 140) + 'px';
  };
  const showCount = (n, capped) => {
    count.textContent = t('notes.count', { n, max: NOTES_MAX_WORDS }) + (capped ? ` ${t('notes.limit')}` : '');
    count.classList.toggle('at-limit', n >= NOTES_MAX_WORDS);
  };
  const save = () => {
    clearTimeout(timer);
    if ((card.notes || '') === area.value) return;
    card.notes = area.value;
    updateCard(card.id, { notes: card.notes });
    status.textContent = t('notes.saved');
  };

  area.addEventListener('input', () => {
    let capped = false;
    if (wordCount(area.value) > NOTES_MAX_WORDS) {
      const pos = area.selectionStart;
      area.value = cutToWords(area.value, NOTES_MAX_WORDS);
      area.setSelectionRange(Math.min(pos, area.value.length), Math.min(pos, area.value.length));
      capped = true;
    }
    showCount(wordCount(area.value), capped);
    grow();
    status.textContent = t('notes.saving');
    clearTimeout(timer);
    timer = setTimeout(save, 600);
  });
  area.addEventListener('blur', save);
  // Save immediately if the card is closed mid-typing.
  sheet().addEventListener('close', save, { once: true });

  showCount(wordCount(area.value), false);
  requestAnimationFrame(grow);
}

/* ---------- Trip name ---------- */

function renderName(card) {
  const box = document.getElementById('d-name');
  if (!box) return;
  box.innerHTML = card.name
    ? `<span class="trip-name-text">${esc(card.name)}</span>
       <button class="name-btn" type="button" aria-label="${esc(t('name.rename'))}">
         <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
       </button>`
    : `<button class="name-btn name-add" type="button">
         <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
         ${esc(t('name.add'))}
       </button>`;
  box.querySelector('.name-btn').addEventListener('click', () => editName(card));
  const bar = document.querySelector('#detail .bar-title');
  if (bar) bar.textContent = tripTitle(card);
}

function editName(card) {
  const box = document.getElementById('d-name');
  box.innerHTML = `<form class="name-form">
      <label class="visually-hidden" for="d-name-input">${esc(t('name.label'))}</label>
      <input id="d-name-input" maxlength="60" autocomplete="off" placeholder="${esc(t('form.namePh'))}" value="${esc(card.name || '')}">
      <button class="name-save" type="submit">${esc(t('save'))}</button>
    </form>`;
  const form = box.querySelector('form');
  const input = form.querySelector('input');
  input.focus();
  input.select();
  const cancel = () => renderName(card);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    card.name = input.value.trim();
    updateCard(card.id, { name: card.name });
    renderName(card);
    toast(card.name ? t('name.saved') : t('name.removed'));
  });
}

function body(key) {
  return document.querySelector(`#detail [data-topic="${key}"] .topic-body`);
}

const skeleton = () => `<div class="skeleton" aria-label="${esc(t('loading'))}"><i></i><i></i><i></i></div>`;

/** Render a topic with loading state, error + retry, and a stale-card guard. */
async function section(card, key, load, render) {
  const el = body(key);
  if (!el) return;
  el.innerHTML = skeleton();
  try {
    const data = await load();
    if (current?.id !== card.id) return;
    el.innerHTML = render(data);
    el.dispatchEvent(new CustomEvent('rendered', { bubbles: true }));
  } catch (err) {
    if (current?.id !== card.id) return;
    el.innerHTML = `<p class="error">${esc(t('error.load', { error: err.message || '?' }))}</p>
      <button class="btn btn-quiet retry" type="button">${esc(t('retry'))}</button>`;
    el.querySelector('.retry').addEventListener('click', () => section(card, key, load, render));
  }
}

function loadAll(card) {
  const countryP = getCountry(card.countryCode, card.countryName);

  section(card, 'language', () => countryP, renderLanguage);
  section(card, 'weather', () => getWeather(card.lat, card.lon, card.arrival, card.departure), renderWeather);
  section(card, 'plugs', async () => plugInfo(card.countryCode, getProfile().home?.countryCode), renderPlugs);
  section(
    card,
    'safety',
    async () => {
      const c = await countryP.catch(() => null);
      const names = [card.countryName, c?.name, c?.official, ...(c?.altNames || [])].filter(Boolean);
      return getSafety({ countryCode: card.countryCode, countryName: c?.name || card.countryName, countryNames: names, city: card.city, region: card.region });
    },
    (d) => renderSafety(d, card)
  ).then(() => loadSafetyHeadlines(card));
  section(card, 'food', () => getRestaurants(card.lat, card.lon), renderPlaces);
  section(card, 'sights', () => getSights(card.lat, card.lon, [card.city, card.region, card.countryName]), (d) => renderSights(d, card));
  section(
    card,
    'news',
    async () => {
      const c = await countryP.catch(() => null);
      const name = c?.name || card.countryName;
      const { items, source } = await getNews(name, { countryCode: card.countryCode, city: card.city, region: card.region });
      return { items, source, name };
    },
    renderNews
  );
  section(card, 'holidays', () => getHolidays(card.countryCode, card.arrival, card.departure), (d) => renderHolidays(d, card));
  loadPhrases(card, countryP);
}

/* ---------- Renderers ---------- */

function renderLanguage(c) {
  if (!c.languages.length) return `<p class="muted">${esc(t('lang.none'))}</p>`;
  const langs = rankLanguages(c.languages);
  const country = countryName(c.code, c.name);
  return `<ul class="lang-list">${langs.map((l) => `<li>${esc(languageName(l.code1, l.name))}</li>`).join('')}</ul>
    <p class="source">${esc(t(langs.length > 1 ? 'lang.many' : 'lang.one', { country }))}</p>`;
}

function renderWeather(w) {
  const valid = w.days.filter((d) => Number.isFinite(d.max));
  if (!valid.length) return `<p class="muted">${esc(t('weather.none'))}</p>`;
  const hi = Math.round(Math.max(...valid.map((d) => d.max)));
  const lo = Math.round(Math.min(...valid.map((d) => d.min)));
  const wet = valid.filter((d) => (d.rain ?? 0) >= 1).length;
  const lead = t(`weather.${w.mode}`);
  const note = w.note ? t(w.note.key, w.note.key === 'weather.runsTo' ? { date: dayMonth(w.note.vars.date) } : w.note.vars) : '';
  return `
    <p class="weather-summary"><strong>${esc(lead)}:</strong> ${esc(t('weather.range', { lo, hi }))}, ${esc(wet ? t('weather.rainDays', { n: wet, total: valid.length }) : t('weather.dry'))}.</p>
    <div class="weather-strip" role="list">
      ${w.days.map((d) => `
        <div class="wday" role="listitem" aria-label="${esc(`${weekday(d.date)} ${dayMonth(d.date)}: ${t(d.key)}, ${Math.round(d.max)}° / ${Math.round(d.min)}°`)}">
          <b>${weekday(d.date)}</b><small>${dayMonth(d.date)}</small>
          <span class="wicon" aria-hidden="true">${d.icon}</span>
          <span class="wmax">${Number.isFinite(d.max) ? Math.round(d.max) + '°' : '–'}</span>
          <span class="wmin">${Number.isFinite(d.min) ? Math.round(d.min) + '°' : ''}</span>
          ${d.rainChance != null ? `<small>${d.rainChance}% 💧</small>` : d.rain >= 1 ? `<small>${d.rain.toFixed(0)} mm</small>` : ''}
        </div>`).join('')}
    </div>
    ${note ? `<p class="source">${esc(note)}</p>` : ''}
    <p class="source">${esc(t('source', { name: 'Open-Meteo' }))}</p>`;
}

function renderPlugs(p) {
  if (!p) return `<p class="muted">${esc(t('plugs.none'))}</p>`;
  const h = p.home;
  let verdict = `<p class="muted">${esc(t('plugs.setHome'))}</p>`;
  if (h) {
    const other = h.types.filter((x) => !h.fitting.includes(x));
    verdict = h.plugsFit
      ? `<p class="verdict ok">${esc(t('plugs.fit', { types: h.types.join('/') }))}</p>`
      : h.someFit
        ? `<p class="verdict ok">${esc(t('plugs.partial', { fit: h.fitting.join('/'), other: other.join('/') }))}</p>`
        : `<p class="verdict warn">${esc(t('plugs.noFit', { types: h.types.join('/') }))}</p>`;
  }
  return `
    <div class="plugs">
      ${p.types.map((x) => `<div class="plug">${plugArt(x)}<span><strong>${esc(t('plugs.type', { t: x }))}</strong><br><small>${esc(t(`plug.${x}`))}</small></span></div>`).join('')}
    </div>
    <p class="source plug-note">${esc(t('plugs.note'))}</p>
    ${verdict}
    <p>${esc(t('plugs.voltage', { v: p.voltage }))}${h?.voltageDiffers ? ` ${esc(t('plugs.voltNote', { home: h.voltage }))}` : ''}</p>`;
}

function renderSafety(s, card) {
  const lvl = s.level && s.level >= 1 && s.level <= 4 ? s.level : null;
  const homeCC = getProfile().home?.countryCode;
  const advice = homeCC && HOME_ADVICE[homeCC];
  const host = advice ? new URL(advice).hostname.replace(/^www\./, '') : '';
  return `
    ${lvl ? `<div class="level level-${lvl}"><span class="level-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${esc(t('safety.level', { n: lvl, text: t(`safety.l${lvl}`) }))}</div>` : ''}
    ${s.parts.map((p) => `<p lang="en"><strong>${esc(p.label)}:</strong> ${esc(p.text)}</p>`).join('')}
    ${s.cityCovered ? '' : `<p class="muted">${esc(t('safety.noLocal', { city: card.city }))}</p>`}
    <div class="safety-news" data-safety-news></div>
    <p class="source">${esc(t('safety.sources'))} ${s.sources.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join(', ')}.${advice ? ` ${esc(t('safety.official'))} <a href="${esc(advice)}" target="_blank" rel="noopener">${esc(host)}</a>.` : ''}</p>`;
}

async function loadSafetyHeadlines(card) {
  const box = document.querySelector('#detail [data-safety-news]');
  if (!box) return;
  box.innerHTML = `<p class="muted">${esc(t('safety.checking'))}</p>`;
  const country = cname(card);
  try {
    const items = await getSafetyHeadlines(card.city, card.countryName, { countryCode: card.countryCode, region: card.region });
    if (current?.id !== card.id) return;
    box.innerHTML = items.length
      ? `<h4>${esc(t('safety.eventsTitle'))}</h4>
         <ul class="news" lang="en">${items.map((n) => `<li><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a><small>${esc(n.domain || '')}</small></li>`).join('')}</ul>
         <p class="source">${esc(t('safety.eventsNote', { city: card.city, country }))}</p>`
      : `<p class="muted">${esc(t('safety.noEvents', { city: card.city, country }))}</p>`;
  } catch {
    if (current?.id === card.id) box.innerHTML = '';
  }
}

function renderPlaces(list) {
  if (!list.length) return `<p class="muted">${esc(t('food.none'))}</p>`;
  return `
    <ol class="places">
      ${list.map((p) => `<li><span><a href="${esc(p.mapUrl)}" target="_blank" rel="noopener">${esc(p.name)}</a>${p.detail ? `<small>${esc(p.detail)}</small>` : ''}</span><span class="dist">${km(p.distance)}</span></li>`).join('')}
    </ol>
    <p class="source">${esc(t('food.note'))}</p>`;
}

function renderSights(list, card) {
  if (!list.length) return `<p class="muted">${esc(t('sights.none', { city: card.city }))}</p>`;
  return `
    <ol class="places sights">
      ${list.map((p) => `<li>
        ${p.image ? `<img class="sight-img" src="${esc(p.image)}" alt="" loading="lazy" width="56" height="56">` : '<span class="sight-img sight-img-empty" aria-hidden="true"></span>'}
        <span><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>${p.detail ? `<small lang="en">${esc(p.detail)}</small>` : ''}</span>
        <span class="dist">${km(p.distance)}</span></li>`).join('')}
    </ol>
    <p class="source">${esc(t('sights.note'))}</p>`;
}

function renderNews({ items, name }) {
  const more = `<a href="${newsSearchUrl(name)}" target="_blank" rel="noopener">${esc(t('news.more'))}</a>`;
  if (!items.length) return `<p class="muted">${esc(t('news.none', { country: name }))}</p><p class="source">${more}</p>`;
  return `
    <ul class="news" lang="en">
      ${items.map((n) => `<li><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a><small>${esc([n.date ? dayMonthDate(n.date) : '', n.domain].filter(Boolean).join(', '))}</small></li>`).join('')}
    </ul>
    <p class="source">${esc(t('news.note', { year: new Date().getFullYear(), country: name }))} ${more}</p>`;
}

function renderHolidays(h, card) {
  const country = cname(card);
  if (!h.covered) return `<p class="muted">${esc(t('hol.noCal', { country }))}</p>`;
  if (!h.items.length) return `<p>${esc(t('hol.none', { country }))}</p><p class="source">${esc(t('source', { name: 'Nager.Date' }))}</p>`;
  return `
    <ul class="holidays">
      ${h.items.map((x) => {
        const d = new Date(x.date + 'T00:00:00');
        const kind = x.types.includes('Public') ? t('hol.public') : x.types.includes('Observance') ? t('hol.observance') : x.types.join(', ');
        return `<li><span class="hdate"><b>${d.getDate()}</b><small>${weekday(x.date)}</small></span>
          <span><strong>${esc(x.localName)}</strong>${x.localName !== x.name ? ` <span class="muted">(${esc(x.name)})</span>` : ''}<br><small>${esc(kind)}${x.regional ? esc(t('hol.regional')) : ''}. ${esc(t('hol.closed'))}</small></span></li>`;
      }).join('')}
    </ul>
    <p class="source">${esc(t('hol.note'))}</p>`;
}

/* ---------- Phrases (interactive) ---------- */

async function loadPhrases(card, countryP) {
  const el = body('phrases');
  el.innerHTML = skeleton();
  let langs;
  try {
    const c = await countryP;
    langs = rankLanguages(c.languages);
  } catch (err) {
    if (current?.id !== card.id) return;
    el.innerHTML = `<p class="error">${esc(t('phr.langsError', { error: err.message }))}</p><button class="btn btn-quiet retry" type="button">${esc(t('retry'))}</button>`;
    el.querySelector('.retry').addEventListener('click', () => loadPhrases(card, getCountry(card.countryCode, card.countryName)));
    return;
  }
  if (current?.id !== card.id) return;
  if (!langs.length) {
    el.innerHTML = `<p class="muted">${esc(t('lang.none'))}</p>`;
    return;
  }
  const first = langs.find((l) => l.available) || langs[0];
  el.innerHTML = `
    ${langs.length > 1 ? `<div class="chips" role="group" aria-label="${esc(t('phr.language'))}">${langs.map((l) => `<button type="button" class="chip" data-code="${esc(l.code)}" aria-pressed="false" ${l.available ? '' : 'disabled'}>${esc(languageName(l.code1, l.name))}</button>`).join('')}</div>` : ''}
    <div class="phrase-body"></div>`;
  el.querySelectorAll('.chip').forEach((b) =>
    b.addEventListener('click', () => showLanguage(card, el, langs.find((l) => l.code === b.dataset.code)))
  );
  showLanguage(card, el, first);
}

async function showLanguage(card, el, lang) {
  el.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.code === lang.code)));
  const out = el.querySelector('.phrase-body');
  out.innerHTML = skeleton();
  try {
    const p = await getPhrases(lang);
    if (current?.id !== card.id) return;
    const lname = languageName(lang.code1, p.name);
    const cell = (x) => `<span>${esc(x.text)}</span>${x.roman ? `<small>${esc(x.roman)}</small>` : ''}`;
    out.innerHTML = `
      <ol class="numbers" aria-label="${esc(t('phr.numbersAria', { lang: lname }))}">
        ${p.numbers.map((n, i) => `<li><b>${i + 1}</b>${cell(n)}</li>`).join('')}
      </ol>
      <table class="phrases" aria-label="${esc(t('phr.wordsAria', { lang: lname }))}">
        <tbody>${PHRASE_KEYS.map((k) => `<tr><th scope="row">${esc(t(`phr.${k}`))}</th><td>${cell(p.phrases[k])}</td></tr>`).join('')}</tbody>
      </table>
      ${p.note ? `<p class="source">${esc(p.note)}</p>` : ''}
      <p class="source">${esc(t(p.source === 'machine' ? 'phr.machine' : 'phr.book', { lang: lname }))}</p>`;
  } catch (err) {
    if (current?.id !== card.id) return;
    out.innerHTML = `<p class="error">${esc(t('phr.error', { lang: languageName(lang.code1, lang.name), error: err.message }))}</p><button class="btn btn-quiet retry" type="button">${esc(t('retry'))}</button>`;
    out.querySelector('.retry').addEventListener('click', () => showLanguage(card, el, lang));
  }
}

export function closeDetail() {
  closeSheet(sheet());
}
