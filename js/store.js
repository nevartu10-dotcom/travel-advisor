// The only thing this app stores on the device: the user's trip cards.
// Everything shown inside a card is fetched live from public services.

const KEY = 'travel-advisor.cards.v1';
const listeners = new Set();

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
