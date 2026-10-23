// App entry: tabs, list rendering, wiring.
import { getCards, onChange } from './store.js';
import { initMap, renderPins, refreshSize, focusCard, fitAll } from './map.js';
import { initForm, openForm } from './form.js';
import { initDetail, openDetail } from './detail.js';
import { flagEmoji } from './api/country.js';
import { esc, dateRange, countdown, isPast, toast } from './ui.js';

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
    </div>`;
    root.querySelector('[data-add]').addEventListener('click', () => openForm());
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
              <span class="ticket-main"><span class="ticket-city">${esc(c.city)}</span><span class="ticket-meta">${esc(c.countryName)}, ${dateRange(c.arrival, c.departure)}</span></span>
              <span class="ticket-when">${countdown(c)}</span>
            </button></li>`
          )
          .join('')}</ul></div>`
      : '';
  root.innerHTML = group('Upcoming', upcoming) + group('Past trips', past);
}

function render() {
  const cards = getCards();
  renderList(cards);
  renderPins(cards);
  $('map-hint').textContent = cards.length ? 'Tap a pin to open it, or the map to add a trip.' : 'Tap anywhere on the map to plan a trip there.';
}

function updateOnline() {
  $('net-status').hidden = navigator.onLine;
}

function start() {
  initMap({ onOpenCard: openDetail, onAddAt: (lat, lon) => openForm({ lat, lon }) });
  initForm({
    created: (card) => {
      toast(`Trip to ${card.city} added`);
      if (view === 'map') focusCard(card);
      openDetail(card.id);
    },
  });
  initDetail({ deleted: (card) => toast(`Trip to ${card.city} deleted`) });

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));
  document.querySelector('.tabbar').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setView(view === 'map' ? 'list' : 'map', { focus: true });
  });
  $('add-btn').addEventListener('click', () => openForm());
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
