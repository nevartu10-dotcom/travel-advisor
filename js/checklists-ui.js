// Checklists tab (list of checklists, editor sheet) and the checklist section of a trip card.
import { getLists, getList, createList, copyList, renameList, deleteList, addItem, editItem, removeItem, moveItem, progress, MAX_TEXT } from './checklists.js';
import { makeSortable } from './sortable.js';
import { getCards, updateCard } from './store.js';
import { t, tp } from './i18n.js';
import { esc, openSheet, closeSheet, confirmDialog, toast, tripTitle } from './ui.js';

const $ = (id) => document.getElementById(id);
const usedBy = (id) => getCards().filter((c) => c.checklistId === id);

const ICON = {
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
};

/* ---------- Tab: all checklists ---------- */

export function renderChecklistsTab() {
  const root = $('checklists');
  const lists = getLists();
  if (!lists.length) {
    root.innerHTML = `<div class="empty">
      <h2>${esc(t('cl.empty.title'))}</h2>
      <p>${esc(t('cl.empty.text'))}</p>
      <button class="btn btn-primary" type="button" data-new>${esc(t('cl.empty.add'))}</button>
    </div>`;
    return;
  }
  root.innerHTML = `<div class="list-group"><p class="muted cl-intro">${esc(t('cl.intro'))}</p><ul class="cl-lists">${lists
    .map((l) => {
      const n = usedBy(l.id).length;
      return `<li class="cl-row" data-id="${esc(l.id)}">
        <button class="cl-open" type="button" data-list-edit>
          <span class="cl-name">${esc(l.name)}</span>
          <span class="ticket-meta">${esc(tp('cl.items', l.items.length))}${n ? ` · ${esc(tp('cl.used', n))}` : ''}</span>
        </button>
        <button class="icon-btn" type="button" data-list-copy aria-label="${esc(t('cl.copyAria', { name: l.name }))}">${ICON.copy}</button>
        <button class="icon-btn danger" type="button" data-list-delete aria-label="${esc(t('cl.deleteAria', { name: l.name }))}">${ICON.trash}</button>
      </li>`;
    })
    .join('')}</ul></div>`;
}

async function confirmDelete(list) {
  const n = usedBy(list.id).length;
  const msg = n ? tp('cl.confirmDeleteUsed', n, { name: list.name }) : t('cl.confirmDelete', { name: list.name });
  if (!(await confirmDialog(msg, t('confirm.delete')))) return false;
  // Trips that used it are left without a checklist.
  usedBy(list.id).forEach((c) => updateCard(c.id, { checklistId: undefined, checked: undefined }));
  deleteList(list.id);
  toast(t('cl.deleted', { name: list.name }));
  return true;
}

function newList() {
  openEditor(createList(t('cl.new')).id, { fresh: true });
}

/* ---------- Editor sheet ---------- */

let editing = null; // { id, fresh }

const handle = (i) => `<button class="drag-handle" type="button" aria-label="${esc(t('cl.moveItem', { item: i.text }))}">${ICON.grip}</button>`;

function renderEditorItems() {
  const list = getList(editing.id);
  const ul = $('le-items');
  ul.innerHTML = list.items.length
    ? list.items
        .map((i) => `<li data-id="${esc(i.id)}">
          ${handle(i)}
          <input class="cl-text" value="${esc(i.text)}" maxlength="${MAX_TEXT}" aria-label="${esc(t('cl.itemAria'))}">
          <button class="icon-btn" type="button" data-remove aria-label="${esc(t('cl.removeItem', { item: i.text }))}">${ICON.x}</button>
        </li>`)
        .join('')
    : `<li class="muted cl-none">${esc(t('cl.noItems'))}</li>`;
  $('le-count').textContent = tp('cl.items', list.items.length);
}

export function openEditor(id, { fresh = false } = {}) {
  const list = getList(id);
  if (!list) return;
  editing = { id, fresh };
  $('list-body').innerHTML = `
    <label class="field">
      <span>${esc(t('cl.name'))}</span>
      <input id="le-name" maxlength="60" value="${esc(list.name)}" autocomplete="off">
    </label>
    <div class="field">
      <span class="field-label">${esc(t('cl.itemsTitle'))} <small class="muted" id="le-count"></small></span>
      <ul class="cl-edit-items" id="le-items"></ul>
      <form class="field-inline cl-add" id="le-add" autocomplete="off">
        <input id="le-new" maxlength="${MAX_TEXT}" placeholder="${esc(t('cl.addPh'))}" aria-label="${esc(t('cl.addPh'))}" enterkeyhint="done">
        <button class="btn btn-quiet" type="submit">${esc(t('cl.add'))}</button>
      </form>
      <p class="field-note muted">${esc(t('cl.autosave'))}</p>
    </div>
    <div class="cl-actions">
      <button class="btn btn-quiet" type="button" id="le-copy">${ICON.copy}${esc(t('cl.copy'))}</button>
      <button class="btn btn-danger" type="button" id="le-delete">${ICON.trash}${esc(t('cl.delete'))}</button>
    </div>`;
  renderEditorItems();

  const name = $('le-name');
  name.addEventListener('change', () => renameList(id, name.value));
  $('le-add').addEventListener('submit', (e) => {
    e.preventDefault();
    if (addItem(id, $('le-new').value)) {
      $('le-new').value = '';
      renderEditorItems();
      $('le-items').lastElementChild?.scrollIntoView({ block: 'nearest' });
    }
    $('le-new').focus();
  });
  makeSortable($('le-items'), (itemId, to) => {
    moveItem(id, itemId, to);
    renderEditorItems();
  });
  $('le-items').addEventListener('change', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    if (e.target.value.trim()) editItem(id, li.dataset.id, e.target.value);
    else e.target.value = getList(id).items.find((i) => i.id === li.dataset.id)?.text || '';
  });
  $('le-items').addEventListener('click', (e) => {
    const li = e.target.closest('[data-remove]')?.closest('li');
    if (!li) return;
    removeItem(id, li.dataset.id);
    renderEditorItems();
  });
  $('le-copy').addEventListener('click', () => {
    renameList(id, name.value);
    editing.fresh = false;
    const copy = copyList(id);
    toast(t('cl.copied', { name: copy.name }));
    openEditor(copy.id);
    $('le-name').focus();
  });
  $('le-delete').addEventListener('click', async () => {
    if (await confirmDelete(getList(id))) {
      editing = null;
      closeSheet($('list-sheet'));
    }
  });

  openSheet($('list-sheet'));
  if (fresh) requestAnimationFrame(() => name.select());
}

function finishEditing() {
  if (!editing) return;
  const { id, fresh } = editing;
  const name = $('le-name');
  if (name) renameList(id, name.value);
  const typed = $('le-new')?.value.trim();
  if (typed) addItem(id, typed);
  const list = getList(id);
  // A new list left empty and unnamed isn't worth keeping.
  if (fresh && list && !list.items.length && list.name === t('cl.new')) deleteList(id);
  editing = null;
}

export function initChecklists() {
  const sheet = $('list-sheet');
  sheet.querySelector('[data-close]').addEventListener('click', () => closeSheet(sheet));
  $('list-done').addEventListener('click', () => closeSheet(sheet));
  sheet.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet(sheet);
  });
  sheet.addEventListener('close', finishEditing);
  $('add-list-btn').addEventListener('click', newList);
  $('checklists').addEventListener('click', async (e) => {
    if (e.target.closest('[data-new]')) return newList();
    const row = e.target.closest('.cl-row');
    if (!row) return;
    const list = getList(row.dataset.id);
    if (!list) return;
    if (e.target.closest('[data-list-edit]')) openEditor(list.id);
    else if (e.target.closest('[data-list-copy]')) {
      const copy = copyList(list.id);
      toast(t('cl.copied', { name: copy.name }));
    } else if (e.target.closest('[data-list-delete]')) confirmDelete(list);
  });
}

/* ---------- Trip card section ---------- */

// Card checklist order: 'list' = as in the checklist, 'open' = unticked items first.
// Remembered on this device for all trips.
const ORDER_KEY = 'travel-advisor.clOrder';
function getOrder() {
  try {
    return localStorage.getItem(ORDER_KEY) === 'open' ? 'open' : 'list';
  } catch {
    return 'list';
  }
}
function setOrder(v) {
  try {
    localStorage.setItem(ORDER_KEY, v);
  } catch {}
}

function checkItems(list, ticked) {
  const items = getOrder() === 'open'
    ? [...list.items.filter((i) => !ticked.has(i.id)), ...list.items.filter((i) => ticked.has(i.id))] // keeps list order within each group
    : list.items;
  return items
    .map((i) => `<li data-id="${esc(i.id)}">
      <label class="cl-check"><input type="checkbox"${ticked.has(i.id) ? ' checked' : ''}><span>${esc(i.text)}</span></label>
    </li>`)
    .join('');
}

/** Checklist picker and tick boxes inside a trip card. Items are edited only in the Checklists tab. */
export function renderCardChecklist(card, el) {
  const lists = getLists();
  if (!lists.length) {
    el.innerHTML = `<p class="muted">${esc(t('cl.noLists'))}</p>
      <button class="btn btn-quiet" type="button" data-go>${esc(t('cl.goCreate'))}</button>`;
    el.querySelector('[data-go]').addEventListener('click', () => window.dispatchEvent(new CustomEvent('show-checklists')));
    return;
  }
  const list = getList(card.checklistId);
  const ticked = new Set(card.checked || []);
  el.innerHTML = `
    <label class="field cl-pick">
      <span>${esc(t('cl.choose'))}</span>
      <select id="d-cl">
        <option value="">${esc(t('cl.none'))}</option>
        ${lists.map((l) => `<option value="${esc(l.id)}"${list?.id === l.id ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}
      </select>
    </label>
    ${list ? `
      <div class="cl-progress" aria-live="polite"><span id="d-cl-progress"></span><span class="cl-bar"><i id="d-cl-bar"></i></span></div>
      ${list.items.length > 1 ? `
      <fieldset class="segmented-field cl-order">
        <legend class="visually-hidden">${esc(t('cl.order'))}</legend>
        <div class="segmented" role="radiogroup">
          <label><input type="radio" name="cl-order" value="list"${getOrder() === 'list' ? ' checked' : ''}><span>${esc(t('cl.orderList'))}</span></label>
          <label><input type="radio" name="cl-order" value="open"${getOrder() === 'open' ? ' checked' : ''}><span>${esc(t('cl.orderOpen'))}</span></label>
        </div>
      </fieldset>` : ''}
      <ul class="cl-checks">${checkItems(list, ticked)}</ul>
      ${list.items.length ? '' : `<p class="muted">${esc(t('cl.emptyList'))}</p>`}` : ''}`;

  const showProgress = () => {
    const p = progress(card, getList(list.id));
    $('d-cl-progress').textContent = p.total && !p.left ? t('cl.allDone') : t('cl.progress', { done: p.done, total: p.total });
    $('d-cl-progress').classList.toggle('ok', !!(p.total && !p.left));
    $('d-cl-bar').style.width = `${p.total ? (100 * p.done) / p.total : 0}%`;
  };

  el.querySelector('#d-cl').addEventListener('change', (e) => {
    card.checklistId = e.target.value || undefined;
    updateCard(card.id, { checklistId: card.checklistId });
    renderCardChecklist(card, el);
  });
  if (!list) return;
  showProgress();
  const ul = el.querySelector('.cl-checks');
  const redraw = (focusId) => {
    ul.innerHTML = checkItems(getList(list.id), new Set(card.checked || []));
    if (focusId) ul.querySelector(`li[data-id="${CSS.escape(focusId)}"] input`)?.focus({ preventScroll: true });
  };
  el.querySelector('.cl-order')?.addEventListener('change', (e) => {
    setOrder(e.target.value);
    redraw();
  });
  let moveTimer = 0;
  ul.addEventListener('change', (e) => {
    const id = e.target.closest('li')?.dataset.id;
    if (!id) return;
    const set = new Set(card.checked || []);
    if (e.target.checked) set.add(id);
    else set.delete(id);
    card.checked = [...set];
    updateCard(card.id, { checked: card.checked });
    showProgress();
    // Unticked first: let the tick show for a moment, then move the item.
    if (getOrder() === 'open') {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => redraw(id), 350);
    }
  });
}

/* ---------- Start-page warning ---------- */

const DAY = 86400000;

/** Trips starting within 24 hours (or today) whose checklist still has unticked items. */
export function unfinishedSoon(now = Date.now()) {
  return getCards()
    .map((c) => {
      const start = new Date(c.arrival + 'T00:00:00').getTime();
      if (now < start - DAY || now >= start + DAY) return null;
      const p = progress(c);
      return p && p.left > 0 ? { card: c, p, today: now >= start } : null;
    })
    .filter(Boolean);
}

export function warningLines(now) {
  return unfinishedSoon(now).map(({ card, p, today }) => ({
    id: card.id,
    text: tp('cl.warn.text', p.left, { title: tripTitle(card), when: t(today ? 'cl.warn.today' : 'cl.warn.tomorrow'), list: p.list.name }),
  }));
}
