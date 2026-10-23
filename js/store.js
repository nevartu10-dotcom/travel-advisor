// The only thing this app stores on the device: the user's trip cards (with notes).
// Everything shown inside a card is fetched live from public services.

const KEY = 'travel-advisor.cards.v1';
const META = 'travel-advisor.meta.v1'; // { lastChange, lastBackup } timestamps
const listeners = new Set();

export function getMeta() {
  try {
    return JSON.parse(localStorage.getItem(META)) || {};
  } catch {
    return {};
  }
}

export function setMeta(patch) {
  try {
    localStorage.setItem(META, JSON.stringify({ ...getMeta(), ...patch }));
  } catch {}
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const cards = raw ? JSON.parse(raw) : [];
    return Array.isArray(cards) ? cards : [];
  } catch {
    return [];
  }
}

function write(cards) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
    setMeta({ lastChange: Date.now() });
  } catch (err) {
    console.warn('Could not save cards', err);
  }
  listeners.forEach((fn) => fn(cards));
}

export function getCards() {
  return read().sort((a, b) => a.arrival.localeCompare(b.arrival));
}

export function getCard(id) {
  return read().find((c) => c.id === id) || null;
}

export function addCard(card) {
  const full = {
    ...card,
    id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2),
    createdAt: new Date().toISOString(),
  };
  write([...read(), full]);
  return full;
}

export function updateCard(id, patch) {
  write(read().map((c) => (c.id === id ? { ...c, ...patch } : c)));
}

export function deleteCard(id) {
  write(read().filter((c) => c.id !== id));
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ---------- Backup support ---------- */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A card from a backup file is usable if it has a place and valid dates. */
export function validCard(c) {
  return (
    c && typeof c === 'object' &&
    typeof c.city === 'string' && c.city &&
    /^[A-Za-z]{2}$/.test(c.countryCode || '') &&
    Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon)) &&
    DATE.test(c.arrival || '') && DATE.test(c.departure || '')
  );
}

const TEXT_FIELDS = ['id', 'name', 'city', 'address', 'region', 'countryName', 'countryCode', 'label', 'arrival', 'departure', 'notes', 'createdAt'];

function cleanCard(c) {
  const out = {};
  for (const k of TEXT_FIELDS) if (c[k] != null) out[k] = String(c[k]).slice(0, k === 'notes' ? 20000 : 500);
  out.lat = Number(c.lat);
  out.lon = Number(c.lon);
  out.countryCode = out.countryCode.toUpperCase();
  if (!out.id) out.id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2);
  return out;
}

/** Merge cards from a backup: new ones are added, ones with the same id are replaced. */
export function importCards(list) {
  const current = read();
  const byId = new Map(current.map((c) => [c.id, c]));
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const raw of list) {
    if (!validCard(raw)) {
      skipped++;
      continue;
    }
    const c = cleanCard(raw);
    if (byId.has(c.id)) updated++;
    else added++;
    byId.set(c.id, c);
  }
  if (added || updated) write([...byId.values()]);
  return { added, updated, skipped };
}
