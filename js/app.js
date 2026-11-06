// App entry: tabs, list rendering, wiring.
import { applyStatic, t, tp, countryName, lang } from './i18n.js';
import { getCards, onChange, setMeta } from './store.js';
import { getLists } from './checklists.js';
import { initMap, renderPins, renderHome, refreshSize, focusCard, fitAll, showPlace } from './map.js';
import { searchPlace } from './api/geocode.js';
import { downloadBackup, restoreFrom, requestPersistence, needsBackup, lastBackupText } from './backup.js';
import { initForm, openForm } from './form.js';
import { initDetail, openDetail } from './detail.js';
import { initProfile, openProfile } from './profile-ui.js';
import { getProfile, hasProfile, homeWelcome, homeBirthday, isBirthday, ageOn, onProfileChange } from './profile.js';
import { birthdayGreeting } from './data/birthday.js';
import { seedIfNew, onListsChange, progress } from './checklists.js';
import { initChecklists, renderChecklistsTab, warningLines } from './checklists-ui.js';
import { flagEmoji } from './api/country.js';
import { esc, dateRange, countdown, isPast, isNow, toast, tripTitle, tripLabel, openSheet, closeSheet } from './ui.js';

const $ = (id) => document.getElementById(id);
let view = 'map';
const VIEWS = ['map', 'list', 'checklists'];
const TITLES = { map: 'app.title.map', list: 'app.title.list', checklists: 'app.title.checklists' };

applyStatic();
seedIfNew();

function setView(next, { focus } = {}) {
  view = VIEWS.includes(next) ? next : 'map';
  VIEWS.forEach((v) => ($('view-' + v).hidden = view !== v));
  document.querySelectorAll('.tab').forEach((tab) => {
    const on = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  });
  $('appbar-title').textContent = t(TITLES[view]);
  history.replaceState(history.state, '', '#' + view);
  try { localStorage.setItem('travel-advisor.view', view); } catch {}
  if (view === 'map') requestAnimationFrame(refreshSize);
  if (focus) $('tab-' + view).focus();
}

function renderList(cards) {
  const root = $('trip-list');
  if (!cards.length) {
    root.innerHTML = `<div class="empty">
      <h2>${esc(t('list.empty.title'))}</h2>
      <p>${esc(t('list.empty.text'))}</p>
      <button class="btn btn-primary" type="button" data-add>${esc(t('list.empty.add'))}</button>
      <br><button class="btn btn-quiet" type="button" data-restore>${esc(t('list.empty.restore'))}</button>
    </div>`;
    root.querySelector('[data-add]').addEventListener('click', () => openForm());
    root.querySelector('[data-restore]').addEventListener('click', openBackup);
    return;
  }
  const upcoming = cards.filter((c) => !isPast(c));
  const past = cards.filter(isPast).reverse();
  const group = (title, list) =>
    list.length
      ? `<div class="list-group"><h2>${esc(title)}</h2><ul class="tickets">${list
          .map(
            (c) => `<li><button class="ticket${isPast(c) ? ' past' : ''}" type="button" data-id="${esc(c.id)}">
              <span class="ticket-flag" aria-hidden="true">${flagEmoji(c.countryCode)}</span>
              <span class="ticket-main"><span class="ticket-city">${esc(tripTitle(c))}</span><span class="ticket-meta">${c.name ? `${esc(c.city)}, ` : ''}${esc(countryName(c.countryCode, c.countryName))}, ${dateRange(c.arrival, c.departure)}</span>${clChip(c)}</span>
              <span class="ticket-when">${esc(countdown(c))}</span>
            </button></li>`
          )
          .join('')}</ul></div>`
      : '';
  const nudge = needsBackup()
    ? `<button class="backup-nudge" type="button" data-backup>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4m0 3h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>
        <span>${esc(t('list.nudge'))}</span>
      </button>`
    : '';
  root.innerHTML = nudge + group(t('list.upcoming'), upcoming) + group(t('list.past'), past);
  root.querySelector('[data-backup]')?.addEventListener('click', openBackup);
}

/** "🧳 9/12" on a trip in the list, when it has a checklist. */
function clChip(c) {
  const p = progress(c);
  if (!p || !p.total) return '';
  const done = !p.left;
  return `<span class="ticket-cl${done ? ' done' : ''}">🧳 ${esc(t('cl.chip', { done: p.done, total: p.total }))}${done ? ' ✓' : ''}</span>`;
}

/* ---------- Unfinished checklist warning ---------- */

// Shown when the app opens; later changes only update it (or hide it once done).
let warnActive = false;
function renderWarning({ opening = false } = {}) {
  const box = $('cl-warn');
  if (opening) warnActive = true;
  const lines = warnActive ? warningLines() : [];
  if (!lines.length) warnActive = false;
  box.hidden = !lines.length;
  if (!lines.length) return;
  box.innerHTML = `
    <svg class="cl-warn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4m0 3h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>
    <div class="cl-warn-text">
      <p class="cl-warn-title">${esc(t('cl.warn.title'))}</p>
      ${lines.map((l) => `<p>${esc(l.text)} <button class="cl-warn-open" type="button" data-id="${esc(l.id)}">${esc(t('cl.warn.open'))}</button></p>`).join('')}
    </div>
    <button class="icon-btn cl-warn-close" type="button" aria-label="${esc(t('close'))}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>`;
}

function render() {
  const cards = getCards();
  renderList(cards);
  renderChecklistsTab();
  renderWarning();
  renderPins(cards);
  renderHome(getProfile().home);
  $('map-hint').textContent = t(cards.length ? 'hint.pins' : 'hint.empty');
}

/* ---------- Profile button and welcome ---------- */

function renderAvatar() {
  const p = getProfile();
  const initials = (p.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase())
    .join('');
  const el = $('profile-avatar');
  if (initials) {
    el.textContent = initials;
    el.classList.add('has-initials');
  } else {
    el.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5"/></svg>';
    el.classList.remove('has-initials');
  }
}

let welcomeTimer;
function hideWelcome() {
  clearTimeout(welcomeTimer);
  $('welcome').hidden = true;
}

/** Greeting in the home country's language, with the next trip in the app language. */
function showWelcome() {
  const p = getProfile();
  const word = homeWelcome(p) || t('welcome.word');
  const first = (p.name || '').split(/\s+/)[0];
  const greeting = first ? `${word}, ${first}!` : `${word}!`;
  const cards = getCards();
  const now = cards.find(isNow);
  const next = cards.find((c) => !isPast(c) && !isNow(c));
  const line = now
    ? t('welcome.now', { title: tripTitle(now) })
    : next
      ? t('welcome.next', { title: tripTitle(next), when: countdown(next).toLocaleLowerCase() })
      : t('welcome.none');
  const box = $('welcome');
  // On the birthday: "Happy birthday" in the home language (or the app language).
  const bday = isBirthday(p.birthDate);
  const APP3 = { en: 'eng', fi: 'fin', fr: 'fra', de: 'deu', nb: 'nob', pt: 'por', es: 'spa', sv: 'swe' };
  const hello = bday ? `🎂 ${homeBirthday(p) || birthdayGreeting(APP3[lang] || 'eng', first)}` : greeting;
  box.classList.toggle('birthday', bday);
  box.innerHTML = `
    <div class="welcome-text">
      <p class="welcome-hello" dir="auto">${esc(hello)}</p>
      ${bday ? `<p class="welcome-line welcome-bday">${esc(t('birthday.line', { age: ageOn(p.birthDate) }))}</p>` : ''}
      <p class="welcome-line">${esc(hasProfile(p) ? line : t('welcome.setupText'))}</p>
      ${hasProfile(p) ? '' : `<button class="btn btn-quiet welcome-setup" type="button">${esc(t('welcome.setup'))}</button>`}
    </div>
    <button class="icon-btn welcome-close" type="button" aria-label="${esc(t('close'))}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>`;
  box.hidden = false;
  box.querySelector('.welcome-close').addEventListener('click', hideWelcome);
  box.querySelector('.welcome-setup')?.addEventListener('click', () => {
    hideWelcome();
    openProfile();
  });
  // Fade away on its own, unless the person is reading or using it.
  welcomeTimer = setTimeout(hideWelcome, bday ? 15000 : hasProfile(p) ? 7000 : 12000);
  box.addEventListener('pointerdown', () => clearTimeout(welcomeTimer), { once: true });
}

/* ---------- Backup ---------- */

let persistState = 'unsupported';

function refreshBackupSheet() {
  const n = getCards().length;
  $('backup-status').textContent = `${tp('backup.trips', n)} ${lastBackupText()}`;
  $('backup-save').disabled = n === 0 && !hasProfile() && !getLists().length;
  $('persist-status').textContent = t(`backup.persist.${persistState}`);
}

function openBackup() {
  refreshBackupSheet();
  openSheet($('backup-sheet'));
}

function initBackup() {
  const sheet = $('backup-sheet');
  sheet.querySelector('[data-close]').addEventListener('click', () => closeSheet(sheet));
  sheet.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet(sheet);
  });
  $('backup-btn').addEventListener('click', openBackup);
  $('backup-save').addEventListener('click', () => {
    downloadBackup();
    refreshBackupSheet();
    render();
    toast(t('backup.saved'));
  });
  $('backup-restore').addEventListener('click', () => $('backup-file').click());
  $('backup-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const wasBackedUp = !needsBackup();
    try {
      const { added, updated, skipped, profile, lists } = await restoreFrom(file);
      // If nothing here was unsaved before, what's here now matches a backup.
      if (wasBackedUp) setMeta({ lastBackup: Date.now() });
      const parts = [
        added && t('backup.added', { n: added }),
        updated && t('backup.updated', { n: updated }),
        skipped && t('backup.skipped', { n: skipped }),
        profile && t('backup.profile'),
        lists && tp('backup.lists', lists),
      ].filter(Boolean);
      toast(t('backup.restored', { parts: parts.join(', ') }));
      refreshBackupSheet();
      render();
      renderAvatar();
      fitAll(getCards());
    } catch (err) {
      toast(err.message);
    }
  });
  requestPersistence().then((s) => (persistState = s));
}

/* ---------- Map search ---------- */

let results = [];

function pickResult(place) {
  results = [];
  $('map-results').innerHTML = '';
  $('map-q').blur();
  showPlace(place, (p) => openForm({ place: p }));
}

async function searchMap(e) {
  e.preventDefault();
  hideWelcome();
  const q = $('map-q').value.trim();
  const box = $('map-results');
  if (!q) {
    box.innerHTML = `<p>${esc(t('search.typeSomething'))}</p>`;
    return;
  }
  box.innerHTML = `<p>${esc(t('search.searching'))}</p>`;
  try {
    results = await searchPlace('', q);
  } catch (err) {
    box.innerHTML = `<p>${esc(t('search.failed', { error: err.message }))}</p>`;
    return;
  }
  if (!results.length) {
    box.innerHTML = `<p>${esc(t('search.none', { q }))}</p>`;
    return;
  }
  if (results.length === 1) return pickResult(results[0]);
  box.innerHTML = results
    .map((r, i) => `<button type="button" class="result" data-i="${i}">
      <span aria-hidden="true">${flagEmoji(r.countryCode)}</span>
      <span>${esc(r.city || r.name)}, ${esc(countryName(r.countryCode, r.countryName))}<small>${esc(r.label)}</small></span>
    </button>`)
    .join('');
}

function updateOnline() {
  $('net-status').hidden = navigator.onLine;
}

/** Remove the opening animation when it ends (or after a safety timeout), then continue. */
function afterSplash(done) {
  const s = $('splash');
  if (!s) return done();
  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;
    s.remove();
    done();
  };
  // The fade-out may already be over if the app was slow to load; `finished` covers both cases.
  const fade = s.getAnimations?.().find((a) => a.animationName === 'splash-out');
  if (fade) fade.finished.then(end, end);
  // With "reduce motion" on, animations are off: show the logo still, briefly.
  setTimeout(end, fade ? 2600 : 900);
}

function start() {
  initMap({ onOpenCard: openDetail, onAddAt: (lat, lon) => openForm({ lat, lon }) });
  initForm({
    created: (card) => {
      toast(t('toast.added', { title: tripLabel(card) }));
      if (view === 'map') focusCard(card);
      openDetail(card.id);
    },
  });
  initDetail({ deleted: (card) => toast(t('toast.deleted', { title: tripLabel(card) })) });
  initBackup();
  initChecklists();
  onListsChange(render);
  window.addEventListener('show-checklists', () => {
    closeSheet($('detail-sheet'));
    setView('checklists');
  });
  $('cl-warn').addEventListener('click', (e) => {
    const open = e.target.closest('.cl-warn-open');
    if (open) {
      hideWelcome();
      openDetail(open.dataset.id, { focus: 'checklist' });
    } else if (e.target.closest('.cl-warn-close')) {
      warnActive = false;
      renderWarning();
    }
  });
  initProfile({ saved: () => render() });
  let lastHome = JSON.stringify([getProfile().home?.lat, getProfile().home?.lon]);
  onProfileChange((p) => {
    renderAvatar();
    renderHome(p.home);
    // A new home address: reframe the map so home and trips are both in view.
    const now = JSON.stringify([p.home?.lat, p.home?.lon]);
    if (now !== lastHome) {
      lastHome = now;
      setTimeout(() => fitAll(getCards()), 50);
    }
  });
  $('profile-btn').addEventListener('click', () => {
    hideWelcome();
    openProfile();
  });

  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));
  document.querySelector('.tabbar').addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step) setView(VIEWS[(VIEWS.indexOf(view) + step + VIEWS.length) % VIEWS.length], { focus: true });
  });
  $('add-btn').addEventListener('click', () => openForm());
  $('map-search').addEventListener('submit', searchMap);
  $('map-q').addEventListener('input', () => { if (!$('map-q').value) $('map-results').innerHTML = ''; });
  $('map-results').addEventListener('click', (e) => {
    const b = e.target.closest('.result');
    if (b) pickResult(results[Number(b.dataset.i)]);
  });
  $('trip-list').addEventListener('click', (e) => {
    const tk = e.target.closest('.ticket');
    if (tk) openDetail(tk.dataset.id);
  });
  window.addEventListener('focus-card', (e) => {
    setView('map');
    setTimeout(() => focusCard(e.detail), 50);
  });

  // Closing a sheet steps back in history; keep the address in sync with the visible tab.
  window.addEventListener('popstate', () => history.replaceState(history.state, '', '#' + view));

  onChange(render);
  window.addEventListener('storage', render);
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();

  let initial = location.hash.slice(1);
  if (!initial) {
    try { initial = localStorage.getItem('travel-advisor.view') || 'map'; } catch { initial = 'map'; }
  }
  setView(initial);
  render();
  renderAvatar();
  // Welcome and checklist warning come in once the opening animation has finished.
  afterSplash(() => {
    renderWarning({ opening: true });
    showWelcome();
  });
  if (view === 'map') setTimeout(() => fitAll(getCards()), 100);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered', err));
  }
}

start();
