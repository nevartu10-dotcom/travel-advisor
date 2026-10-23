// Small fetch wrapper: timeout, JSON parsing, readable errors.

export class FetchError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function fetchJSON(url, { timeout = 15000, ...opts } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (res.status === 204) return null;
    if (!res.ok) throw new FetchError(`${new URL(url).hostname} answered ${res.status}`, res.status);
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new FetchError(`${new URL(url).hostname} sent something other than JSON`);
    }
  } catch (err) {
    if (err.name === 'AbortError') throw new FetchError(`${new URL(url).hostname} took too long to answer`);
    if (err instanceof FetchError) throw err;
    throw new FetchError(navigator.onLine === false ? 'You are offline' : `Could not reach ${new URL(url).hostname}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Keep a string within a word budget, ending with an ellipsis if cut. */
export function limitWords(text, max) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(' ');
  return words.slice(0, max).join(' ').replace(/[,;:.]$/, '') + '…';
}

export function countWords(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

/** Simple in-memory memo so reopening a card in the same session doesn't refetch. */
const memo = new Map();
export function remember(key, fn) {
  if (!memo.has(key)) {
    const p = fn().catch((err) => {
      memo.delete(key);
      throw err;
    });
    memo.set(key, p);
  }
  return memo.get(key);
}
export function forget(prefix) {
  for (const k of memo.keys()) if (k.startsWith(prefix)) memo.delete(k);
}
