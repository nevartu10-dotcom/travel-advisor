// GDELT DOC 2.0 API client. GDELT allows one request every 5 seconds per user,
// so requests are queued and spaced out, with one retry if it still says "slow down".
import { fetchJSON } from './http.js';

const GAP = 5500;
let last = 0;
let chain = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function once(url) {
  const wait = last + GAP - Date.now();
  if (wait > 0) await sleep(wait);
  try {
    return await fetchJSON(url, { timeout: 20000 });
  } finally {
    last = Date.now();
  }
}

export function gdelt(params) {
  const url = 'https://api.gdeltproject.org/api/v2/doc/doc?' + new URLSearchParams({ mode: 'artlist', format: 'json', ...params });
  const run = chain.then(async () => {
    try {
      return await once(url);
    } catch (err) {
      // A rate-limit answer comes back as plain text, which fetchJSON reports as "not JSON".
      if (/other than JSON/.test(err.message)) return once(url);
      throw err;
    }
  });
  chain = run.catch(() => {});
  return run;
}

export function cleanTitle(title) {
  return String(title || '')
    .replace(/\s+[-|–]\s+[^-|–]{2,40}$/, '') // drop " - Site Name" tails
    .replace(/\s+/g, ' ')
    .trim();
}
