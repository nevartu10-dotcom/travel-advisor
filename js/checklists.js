// Checklists: named lists of items, stored on this device (and in backup files).
// A trip card picks one checklist (card.checklistId) and keeps its own ticks
// (card.checked = item ids), so the same list can be reused for many trips.
import { setMeta } from './store.js';
import { t } from './i18n.js';

const KEY = 'travel-advisor.checklists.v1';
const listeners = new Set();
export const MAX_ITEMS = 200;
export const MAX_TEXT = 120;

const newId = () => (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2);

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const lists = raw ? JSON.parse(raw) : [];
    return Array.isArray(lists) ? lists : [];
  } catch {
    return [];
  }
}

function write(lists, { touch = true } = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lists));
    if (touch) setMeta({ lastChange: Date.now() });
  } catch (err) {
    console.warn('Could not save checklists', err);
  }
  listeners.forEach((fn) => fn(lists));
}

export function onListsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLists() {
  return read().sort((a, b) => a.name.localeCompare(b.name));
}

export function getList(id) {
  return (id && read().find((l) => l.id === id)) || null;
}

function change(id, fn) {
  let out = null;
  write(read().map((l) => (l.id === id ? (out = fn({ ...l, items: [...l.items] })) : l)));
  return out;
}

const cleanText = (s, max = MAX_TEXT) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function createList(name, texts = []) {
  const list = {
    id: newId(),
    name: cleanText(name, 60) || t('cl.new'),
    items: texts.map((x) => cleanText(x)).filter(Boolean).slice(0, MAX_ITEMS).map((text) => ({ id: newId(), text })),
    createdAt: new Date().toISOString(),
  };
  write([...read(), list]);
  return list;
}

/** A new list with the same items (new ids, so ticks on trips don't carry over). */
export function copyList(id) {
  const src = getList(id);
  if (!src) return null;
  return createList(t('cl.copyName', { name: src.name }).slice(0, 60), src.items.map((i) => i.text));
}

export function renameList(id, name) {
  return change(id, (l) => ({ ...l, name: cleanText(name, 60) || t('cl.new') }));
}

export function deleteList(id) {
  write(read().filter((l) => l.id !== id));
}

export function addItem(listId, text) {
  const clean = cleanText(text);
  if (!clean) return null;
  let item = null;
  change(listId, (l) => {
    if (l.items.length >= MAX_ITEMS) return l;
    item = { id: newId(), text: clean };
    return { ...l, items: [...l.items, item] };
  });
  return item;
}

export function editItem(listId, itemId, text) {
  const clean = cleanText(text);
  if (!clean) return;
  change(listId, (l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, text: clean } : i)) }));
}

export function removeItem(listId, itemId) {
  change(listId, (l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) }));
}

/** Ticked / total for a trip, counting only items that still exist in its list. */
export function progress(card, list = getList(card.checklistId)) {
  if (!list) return null;
  const ticked = new Set(Array.isArray(card.checked) ? card.checked : []);
  const done = list.items.filter((i) => ticked.has(i.id)).length;
  return { done, total: list.items.length, left: list.items.length - done, list };
}

/** First run: one starter packing list in the app language (not counted as a change to back up). */
export function seedIfNew() {
  try {
    if (localStorage.getItem(KEY) !== null) return;
  } catch {
    return;
  }
  const items = t('cl.seed').split('|');
  write([{ id: newId(), name: t('cl.seedName'), items: items.map((text) => ({ id: newId(), text })), createdAt: new Date().toISOString() }], { touch: false });
}

/* ---------- Backup ---------- */

function cleanList(l) {
  if (!l || typeof l !== 'object' || !Array.isArray(l.items)) return null;
  const items = l.items
    .filter((i) => i && cleanText(i.text))
    .slice(0, MAX_ITEMS)
    .map((i) => ({ id: typeof i.id === 'string' && i.id ? i.id.slice(0, 80) : newId(), text: cleanText(i.text) }));
  return {
    id: typeof l.id === 'string' && l.id ? l.id.slice(0, 80) : newId(),
    name: cleanText(l.name, 60) || t('cl.new'),
    items,
    createdAt: typeof l.createdAt === 'string' ? l.createdAt.slice(0, 40) : new Date().toISOString(),
  };
}

/** Merge lists from a backup: new ones are added, ones with the same id are replaced. */
export function importLists(lists) {
  const byId = new Map(read().map((l) => [l.id, l]));
  let n = 0;
  for (const raw of lists) {
    const l = cleanList(raw);
    if (!l) continue;
    byId.set(l.id, l);
    n++;
  }
  if (n) write([...byId.values()]);
  return n;
}
