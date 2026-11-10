// Built-in user manual: the "?" button on each screen shows speech bubbles next to its functions.
// Bubbles follow their function while you scroll; changing screen (tab, card or page) closes help.
import { t } from './i18n.js';
import { esc } from './ui.js';

// [screen, selector of the function, help text key]. Screens: map, list, checklists (tabs),
// and the ids of the full-screen pages. Only functions currently on screen get a bubble.
const TARGETS = [
  // Shared top bar and tab bar (all three tabs)
  ['tabs', '#backup-btn', 'help.backup'],
  ['tabs', '#profile-btn', 'help.profile'],
  ['tabs', '.tabbar', 'help.tabs'],
  // Map
  ['map', '#map-search', 'help.search'],
  ['map', '#map .pin', 'help.pin'],
  ['map', '#map .home-pin', 'help.home'],
  ['map', '#map', 'help.map'],
  // Trips
  ['list', '#trip-list .ticket', 'help.ticket'],
  ['list', '#trip-list .ticket-cl', 'help.ticketCl'],
  ['list', '#trip-list .ticket-map', 'help.ticketMap'],
  ['list', '#trip-list .backup-nudge', 'help.nudge'],
  ['list', '#add-btn', 'help.addTrip'],
  // Checklists
  ['checklists', '#checklists .cl-open', 'help.clOpen'],
  ['checklists', '#checklists [data-list-copy]', 'help.clCopy'],
  ['checklists', '#checklists [data-list-delete]', 'help.clDelete'],
  ['checklists', '#add-list-btn', 'help.clAdd'],
  // Trip card
  ['detail-sheet', '#detail [data-refresh]', 'help.refresh'],
  ['detail-sheet', '#d-name', 'help.name'],
  ['detail-sheet', '#detail .trip-type', 'help.type'],
  ['detail-sheet', '#detail .passport h3', 'help.passport'],
  ['detail-sheet', '#detail [data-topic="facts"] h3', 'help.facts'],
  ['detail-sheet', '#detail [data-topic="language"] h3', 'help.language'],
  ['detail-sheet', '#detail [data-topic="weather"] h3', 'help.weather'],
  ['detail-sheet', '#detail [data-topic="plugs"] h3', 'help.plugs'],
  ['detail-sheet', '#detail [data-topic="safety"] h3', 'help.safety'],
  ['detail-sheet', '#detail [data-topic="food"] h3', 'help.food'],
  ['detail-sheet', '#detail [data-topic="sights"] h3', 'help.sights'],
  ['detail-sheet', '#detail [data-topic="news"] h3', 'help.news'],
  ['detail-sheet', '#detail [data-topic="holidays"] h3', 'help.holidays'],
  ['detail-sheet', '#detail [data-topic="phrases"] h3', 'help.phrases'],
  ['detail-sheet', '#detail .notes h3', 'help.notes'],
  ['detail-sheet', '#detail .checklist h3', 'help.checklist'],
  ['detail-sheet', '#detail .cl-order', 'help.clOrder'],
  ['detail-sheet', '#detail [data-showmap]', 'help.showMap'],
  ['detail-sheet', '#detail .detail-actions [data-delete]', 'help.deleteTrip'],
  // New trip
  ['form-sheet', '.field:has(#f-name)', 'help.fName'],
  ['form-sheet', '#trip-form .segmented-field', 'help.fType'],
  ['form-sheet', '.field:has(#f-country)', 'help.fCountry'],
  ['form-sheet', '.field:has(#f-place)', 'help.fPlace'],
  ['form-sheet', '#f-find', 'help.fFind'],
  ['form-sheet', '#trip-form .field-row', 'help.fDates'],
  ['form-sheet', '#f-submit', 'help.fSubmit'],
  // Profile
  ['profile-sheet', '#p-stats', 'help.pStats'],
  ['profile-sheet', '.field:has(#p-name)', 'help.pName'],
  ['profile-sheet', '.field:has(#p-address)', 'help.pAddress'],
  ['profile-sheet', '.field:has(#p-birth)', 'help.pBirth'],
  ['profile-sheet', '.field:has(#p-gender)', 'help.pGender'],
  ['profile-sheet', '.field:has(#p-passport)', 'help.pPassport'],
  ['profile-sheet', '.field:has(#p-lang)', 'help.pLang'],
  ['profile-sheet', '.field:has(#p-currency)', 'help.pCurrency'],
  // Backup
  ['backup-sheet', '#backup-save', 'help.bSave'],
  ['backup-sheet', '#backup-restore', 'help.bRestore'],
  // Checklist editor
  ['list-sheet', '.field:has(#le-name)', 'help.leName'],
  ['list-sheet', '#le-items .drag-handle', 'help.leDrag'],
  ['list-sheet', '#le-items .cl-text', 'help.leText'],
  ['list-sheet', '#le-items [data-remove]', 'help.leRemove'],
  ['list-sheet', '#le-add', 'help.leAdd'],
  ['list-sheet', '#le-copy', 'help.leCopy'],
  ['list-sheet', '#le-delete', 'help.leDelete'],
];
const SHEETS = ['detail-sheet', 'form-sheet', 'profile-sheet', 'backup-sheet', 'list-sheet'];
const GAP = 10; // between a function and its bubble
const EDGE = 8; // from the screen edge

let layer = null;
let screen = null;
let raf = 0;
let observer = null;
let focusKey = null; // a bubble the user asked for by tapping its badge; placed first

/** Which screen is showing: an open page or card, otherwise the visible tab. */
function currentScreen() {
  const open = [...document.querySelectorAll('dialog[open]')].filter((d) => SHEETS.includes(d.id));
  if (open.length) return open[open.length - 1].id;
  return ['map', 'list', 'checklists'].find((v) => !document.getElementById('view-' + v).hidden) || 'map';
}

const onScreen = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

function setPressed(on) {
  document.querySelectorAll('.help-btn').forEach((b) => b.setAttribute('aria-pressed', String(on)));
}

export function isHelpOpen() {
  return !!layer;
}

export function toggleHelp() {
  if (layer) closeHelp();
  else openHelp();
}

function openHelp() {
  screen = currentScreen();
  focusKey = null;
  layer = document.createElement('div');
  layer.className = 'help-layer';
  layer.setAttribute('role', 'region');
  layer.setAttribute('aria-label', t('help.title'));
  layer.innerHTML = `<button class="help-close" type="button">${esc(t('help.close'))}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
  layer.querySelector('.help-close').addEventListener('click', closeHelp);
  // Inside an open page the layer must live in that dialog to be drawn above it.
  (SHEETS.includes(screen) ? document.getElementById(screen) : document.body).appendChild(layer);
  // "Close help" sits bottom-left, just above the tab bar or the page's bottom buttons.
  const foot = SHEETS.includes(screen) ? document.getElementById(screen).querySelector('.sheet-foot') : document.querySelector('.tabbar');
  layer.querySelector('.help-close').style.bottom = `${(foot ? foot.getBoundingClientRect().height : 0) + 12}px`;
  if (screen === 'map' || screen === 'list' || screen === 'checklists') layer.classList.add('on-tabs');
  setPressed(true);
  document.body.classList.add('help-open');
  addEventListener('scroll', schedule, true);
  addEventListener('resize', schedule);
  addEventListener('keydown', onKey, true);
  observer = new MutationObserver((list) => {
    if (list.every((m) => layer?.contains(m.target))) return; // our own bubbles
    schedule();
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'hidden', 'class'] });
  update();
}

export function closeHelp() {
  if (!layer) return;
  cancelAnimationFrame(raf);
  observer?.disconnect();
  removeEventListener('scroll', schedule, true);
  removeEventListener('resize', schedule);
  removeEventListener('keydown', onKey, true);
  const btn = layer.parentElement?.querySelector?.('.help-btn');
  layer.remove();
  layer = null;
  setPressed(false);
  document.body.classList.remove('help-open');
  btn?.focus?.({ preventScroll: true });
}

function onKey(e) {
  if (e.key === 'Escape') {
    // Close help first; a second Escape closes the page as usual.
    e.preventDefault();
    e.stopPropagation();
    closeHelp();
  }
}

function schedule() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(update);
}

function update() {
  if (!layer) return;
  if (currentScreen() !== screen) return closeHelp(); // the screen changed
  layer.querySelectorAll('.help-ring, .help-bubble, .help-leader, .help-badge').forEach((n) => n.remove());

  const tabs = layer.classList.contains('on-tabs');
  const root = SHEETS.includes(screen) ? document.getElementById(screen) : document;
  const items = TARGETS.filter(([s]) => s === screen || (tabs && s === 'tabs'))
    .map(([, sel, key]) => {
      const el = root.querySelector(sel);
      if (!el || el.closest('[hidden]')) return null;
      const r = el.getBoundingClientRect();
      return onScreen(r) ? { r, key } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);

  const close = layer.querySelector('.help-close').getBoundingClientRect();
  const isBig = (r) => r.height > innerHeight * 0.4;
  // Bubbles must not cover other functions (except big areas like the map) or each other.
  const grow = (r, n) => ({ left: r.left - n, right: r.right + n, top: r.top - n, bottom: r.bottom + n });
  const obstacles = items.filter((it) => !isBig(it.r)).map((it) => grow(it.r, 4));
  const title = SHEETS.includes(screen) && root.querySelector('.sheet-head h2');
  if (title) obstacles.push(grow(title.getBoundingClientRect(), 2));
  const placed = [grow(close, 4)];
  const minTop = EDGE;
  const maxBottom = innerHeight - EDGE;
  // A bubble the user tapped a badge for may cover other functions; the rest may not.
  let ignoreObstacles = false;
  const free = (box, own) => box.left >= EDGE && box.right <= innerWidth - EDGE && box.top >= minTop && box.bottom <= maxBottom
    && !placed.some((p) => overlaps(box, p)) && (ignoreObstacles || !obstacles.some((o) => o !== own && overlaps(box, o)));
  // Small functions first; big areas (the map) take what space is left.
  items.sort((a, b) => (b.key === focusKey) - (a.key === focusKey) || isBig(a.r) - isBig(b.r) || a.r.top - b.r.top || a.r.left - b.r.left);

  for (const it of items) {
    const { r, key } = it;
    const own = obstacles.find((o) => o.left === r.left - 4 && o.top === r.top - 4);
    ignoreObstacles = key === focusKey;
    const ring = document.createElement('div');
    ring.className = 'help-ring';
    Object.assign(ring.style, { left: `${r.left - 3}px`, top: `${r.top - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px` });
    layer.appendChild(ring);

    const b = document.createElement('div');
    b.className = 'help-bubble';
    b.textContent = t(key);
    layer.appendChild(b);
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    const cx = Math.min(Math.max(r.left + r.width / 2, EDGE + 18), innerWidth - EDGE - 18);
    const cy = r.top + r.height / 2;
    const hl = Math.min(Math.max(cx - w / 2, EDGE), innerWidth - EDGE - w); // centred under or over the function
    const vt = Math.min(Math.max(cy - h / 2, EDGE), innerHeight - EDGE - h); // centred beside it
    const tries = [];
    if (isBig(r)) {
      for (let k = 0; k < 8; k++) tries.push({ left: hl, top: r.top + 70 + k * 40, dir: '' });
    } else {
      tries.push({ left: hl, top: r.bottom + GAP, dir: 'up' }, { left: hl, top: r.top - GAP - h, dir: 'down' });
      tries.push({ left: r.left - GAP - w, top: vt, dir: 'left' }, { left: r.right + GAP, top: vt, dir: 'right' });
      // Further away, joined by a line
      for (let k = 1; k <= 4; k++) {
        tries.push({ left: hl, top: r.bottom + GAP + k * 22, dir: 'up', leader: true });
        tries.push({ left: hl, top: r.top - GAP - h - k * 22, dir: 'down', leader: true });
      }
    }
    const lineBox = (c) => c.dir === 'up'
      ? { left: cx - 2, right: cx + 2, top: r.bottom + 2, bottom: c.top - 8 }
      : { left: cx - 2, right: cx + 2, top: c.top + h + 8, bottom: r.top - 2 };
    const spot = tries
      .map((c) => ({ ...c, box: { left: c.left, right: c.left + w, top: c.top, bottom: c.top + h } }))
      .find((c) => free(c.box, own) && (!c.leader || (!placed.some((p) => overlaps(lineBox(c), p)) && !obstacles.some((o) => o !== own && overlaps(lineBox(c), o)))));
    if (!spot) {
      // No room next to it: a small badge on the ring opens this bubble when tapped.
      b.remove();
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'help-badge';
      badge.textContent = '?';
      badge.setAttribute('aria-label', t(key));
      badge.style.left = `${Math.min(Math.max(r.right - 10, EDGE), innerWidth - EDGE - 24)}px`;
      badge.style.top = `${Math.min(Math.max(r.top - 12, EDGE), innerHeight - EDGE - 24)}px`;
      badge.addEventListener('click', () => {
        focusKey = key;
        update();
      });
      layer.appendChild(badge);
      continue;
    }
    placed.push(grow(spot.box, 3));
    b.style.left = `${spot.left}px`;
    b.style.top = `${spot.top}px`;
    if (spot.dir) b.classList.add(spot.dir);
    b.style.setProperty('--ax', `${cx - spot.left}px`);
    b.style.setProperty('--ay', `${Math.min(Math.max(cy - spot.top, 14), h - 14)}px`);
    if (spot.leader) {
      const line = document.createElement('div');
      line.className = 'help-leader';
      const y1 = spot.dir === 'up' ? r.bottom + 2 : spot.box.bottom + 8;
      const y2 = spot.dir === 'up' ? spot.top - 8 : r.top - 2;
      Object.assign(line.style, { left: `${cx - 1}px`, top: `${y1}px`, height: `${Math.max(0, y2 - y1)}px` });
      layer.insertBefore(line, b);
      placed.push({ left: cx - 3, right: cx + 3, top: y1, bottom: y2 });
    }
    if (key === focusKey) b.classList.add('focused');
    if (false) {
    }
  }
}

/** Close help when the user moves to another screen with its own controls (tabs, pages). */
export function initHelp() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.help-btn')) toggleHelp();
  });
}
