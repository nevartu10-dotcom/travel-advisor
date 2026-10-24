// App entry: tabs, list rendering, wiring.
import { getCards, onChange, setMeta } from './store.js';
import { initMap, renderPins, refreshSize, focusCard, fitAll, showPlace } from './map.js';
import { searchPlace } from './api/geocode.js';
import { downloadBackup, restoreFrom, requestPersistence, needsBackup, lastBackupText } from './backup.js';
import { initForm, openForm } from './form.js';
import { initDetail, openDetail } from './detail.js';
import { flagEmoji } from './api/country.js';
import { esc, dateRange, countdown, isPast, toast, tripTitle, openSheet, closeSheet } from './ui.js';

const $ = (id) => document.getElementById(id);
let view = 'map';

function setView(next, { focus } = {}) {
  view = next === 'list' ? 'list' : 'map';
  $('view-map').hidden = view !== 'map';
  $('view-list').hidden = view !== 'list';
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.view === view;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  $('appbar-title').textContent = view === 'map' ? 'Trip map' : 'Trips';
  history.replaceState(history.state, '', '#' + view);
  try { localStorage.setItem('travel-advisor.view', view); } catch {}
  if (view === 'map') requestAnimationFrame(refreshSize);
  if (focus) $('tab-' + view).focus();
}

function renderList(cards) {
  const root = $('trip-list');
  if (!cards.length) {
    root.innerHTML = `<div class="empty">
      <h2>Where are you going?</h2>
      <p>Add a trip and get the language, weather, plugs, safety, food, sights, news, holidays and key phrases for the place in one card.</p>
      <button class="btn btn-primary" type="button" data-add>Add your first trip</button>
      <br><button class="btn btn-quiet" type="button" data-restore>Restore trips from a backup</button>
    </div>`;
    root.querySelector('[data-add]').addEventListener('click', () => openForm());
    root.querySelector('[data-restore]').addEventListener('click', openBackup);
    return;
  }
  const upcoming = cards.filter((c) => !isPast(c));
  const past = cards.filter(isPast).reverse();
  const group = (title, list) =>
    list.length
      ? `<div class="list-group"><h2>${title}</h2><ul class="tickets">${list
          .map(
            (c) => `<li><button class="ticket${isPast(c) ? ' past' : ''}" type="button" data-id="${esc(c.id)}">
              <span class="ticket-flag" aria-hidden="true">${flagEmoji(c.countryCode)}</span>
              <span class="ticket-main"><span class="ticket-city">${esc(tripTitle(c))}</span><span class="ticket-meta">${c.name ? `${esc(c.city)}, ` : ''}${esc(c.countryName)}, ${dateRange(c.arrival, c.departure)}</span></span>
              <span class="ticket-when">${countdown(c)}</span>
            </button></li>`
          )
          .join('')}</ul></div>`
      : '';
  const nudge = needsBackup()
    ? `<button class="backup-nudge" type="button" data-backup>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4m0 3h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>
        <span>Some trips aren’t backed up. Save a backup so you don’t lose them if browsing data is cleared.</span>
      </button>`
    : '';
  root.innerHTML = nudge + group('Upcoming', upcoming) + group('Past trips', past);
  root.querySelector('[data-backup]')?.addEventListener('click', openBackup);
}

function render() {
  const cards = getCards();
  renderList(cards);
  renderPins(cards);
  $('map-hint').textContent = cards.length ? 'Tap a pin to open its card.' : 'Search above, or tap the map to plan a trip.';
}

/* ---------- Backup ---------- */

let persistState = 'unsupported';

function refreshBackupSheet() {
  const n = getCards().length;
  $('backup-status').textContent = `${n} trip${n === 1 ? '' : 's'} on this phone. ${lastBackupText()}`;
  $('backup-save').disabled = n === 0;
  $('persist-status').textContent = {
    granted: 'This browser has agreed to keep the app’s data even when the phone runs low on storage.',
    denied: 'This browser may delete the app’s data if the phone runs low on storage. Keep a backup.',
    unsupported: 'Keep a backup: this browser doesn’t say whether it will keep the app’s data.',
  }[persistState];
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
    toast('Backup file saved to your downloads');
  });
  $('backup-restore').addEventListener('click', () => $('backup-file').click());
  $('backup-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const wasBackedUp = !needsBackup();
    try {
      const { added, updated, skipped } = await restoreFrom(file);
      // If nothing here was unsaved before, what's here now matches a backup.
      if (wasBackedUp) setMeta({ lastBackup: Date.now() });
      const parts = [added && `${added} added`, updated && `${updated} updated`, skipped && `${skipped} skipped (incomplete)`].filter(Boolean);
      toast(`Trips restored: ${parts.join(', ')}`);
      refreshBackupSheet();
      render();
      fitAll(getCards());
    } catch (err) {
      toast(err.message);
    }
  });
  requestPersistence().then((s) => (persistState = s));
}

let results = [];

function pickResult(place) {
  results = [];
  $('map-results').innerHTML = '';
  $('map-q').blur();
  showPlace(place, (p) => openForm({ place: p }));
}

async function searchMap(e) {
  e.preventDefault();
  const q = $('map-q').value.trim();
  const box = $('map-results');
  if (!q) {
    box.innerHTML = '<p>Type an address, city or place name.</p>';
    return;
  }
  box.innerHTML = '<p>Searching…</p>';
  try {
    results = await searchPlace('', q);
  } catch (err) {
    box.innerHTML = `<p>Search failed: ${esc(err.message)}. Check your connection and try again.</p>`;
    return;
  }
  if (!results.length) {
    box.innerHTML = `<p>No place found for “${esc(q)}”. Check the spelling, or add the city or country.</p>`;
    return;
  }
  if (results.length === 1) return pickResult(results[0]);
  box.innerHTML = results
    .map((r, i) => `<button type="button" class="result" data-i="${i}">
      <span aria-hidden="true">${flagEmoji(r.countryCode)}</span>
      <span>${esc(r.city || r.name)}, ${esc(r.countryName)}<small>${esc(r.label)}</small></span>
    </button>`)
    .join('');
}

function updateOnline() {
  $('net-status').hidden = navigator.onLine;
}

function start() {
  initMap({ onOpenCard: openDetail, onAddAt: (lat, lon) => openForm({ lat, lon }) });
  initForm({
    created: (card) => {
      toast(`${card.name ? `“${card.name}”` : `Trip to ${card.city}`} added`);
      if (view === 'map') focusCard(card);
      openDetail(card.id);
    },
  });
  initDetail({ deleted: (card) => toast(`Trip to ${card.city} deleted`) });
  initBackup();

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));
  document.querySelector('.tabbar').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setView(view === 'map' ? 'list' : 'map', { focus: true });
  });
  $('add-btn').addEventListener('click', () => openForm());
  $('map-search').addEventListener('submit', searchMap);
  $('map-q').addEventListener('input', () => { if (!$('map-q').value) $('map-results').innerHTML = ''; });
  $('map-results').addEventListener('click', (e) => {
    const b = e.target.closest('.result');
    if (b) pickResult(results[Number(b.dataset.i)]);
  });
  $('trip-list').addEventListener('click', (e) => {
    const t = e.target.closest('.ticket');
    if (t) openDetail(t.dataset.id);
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
  if (view === 'map') setTimeout(() => fitAll(getCards()), 100);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered', err));
  }
}

start();
