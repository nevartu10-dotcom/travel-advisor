// Shared UI helpers.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DAY = 86400000;
const parse = (s) => new Date(s + 'T00:00:00');
const fmtDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const fmtDayYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtWeekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

export const weekday = (s) => fmtWeekday.format(parse(s));
export const dayMonth = (s) => fmtDay.format(parse(s));

export function dateRange(a, b) {
  const sameYear = a.slice(0, 4) === b.slice(0, 4);
  return `${sameYear ? fmtDay.format(parse(a)) : fmtDayYear.format(parse(a))} – ${fmtDayYear.format(parse(b))}`;
}

export function tripLength(a, b) {
  const n = Math.round((parse(b) - parse(a)) / DAY) + 1;
  return `${n} day${n === 1 ? '' : 's'}`;
}

function todayLocal() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** The trip's own name if it has one, otherwise the city. */
export const tripTitle = (card) => (card.name && card.name.trim()) || card.city;

export function isPast(card) {
  return parse(card.departure) < todayLocal();
}

export function countdown(card) {
  const today = todayLocal();
  const a = parse(card.arrival);
  const b = parse(card.departure);
  if (today >= a && today <= b) return 'Travelling now';
  if (today > b) {
    const n = Math.round((today - b) / DAY);
    return n < 14 ? `${n} day${n === 1 ? '' : 's'} ago` : n < 60 ? `${Math.round(n / 7)} weeks ago` : `${Math.round(n / 30)} months ago`;
  }
  const n = Math.round((a - today) / DAY);
  if (n === 1) return 'Tomorrow';
  return n < 14 ? `In ${n} days` : n < 60 ? `In ${Math.round(n / 7)} weeks` : `In ${Math.round(n / 30)} months`;
}

export function km(m) {
  if (!Number.isFinite(m)) return '';
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

export function confirmDialog(message, okLabel) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'confirm';
    wrap.innerHTML = `<div class="confirm-box" role="alertdialog" aria-modal="true" aria-label="${esc(message)}">
      <p>${esc(message)}</p>
      <div class="confirm-actions">
        <button class="btn btn-quiet" type="button" data-v="0">Keep</button>
        <button class="btn btn-danger" type="button" data-v="1">${esc(okLabel)}</button>
      </div></div>`;
    const host = document.querySelector('dialog[open]') || document.body;
    host.append(wrap);
    wrap.querySelector('[data-v="0"]').focus();
    wrap.addEventListener('click', (e) => {
      const v = e.target.closest('[data-v]')?.dataset.v;
      if (e.target === wrap || v !== undefined) {
        wrap.remove();
        resolve(v === '1');
      }
    });
  });
}

// Sheets participate in browser history so the phone's back button closes them.
// Closing a sheet in code steps history back too; opening another sheet waits for
// that step to finish so the two don't race.
let pendingBack = null;
let resolveBack = null;

export async function openSheet(dialog) {
  if (pendingBack) await pendingBack;
  if (dialog.open) return;
  dialog.showModal();
  history.pushState({ sheet: dialog.id }, '');
}

export function closeSheet(dialog) {
  if (!dialog.open) return;
  dialog.close();
  if (history.state?.sheet === dialog.id && !pendingBack) {
    pendingBack = new Promise((r) => (resolveBack = r));
    history.back();
  }
}

window.addEventListener('popstate', () => {
  if (pendingBack) {
    resolveBack();
    pendingBack = resolveBack = null;
    return;
  }
  // The user pressed the browser/phone back button.
  document.querySelectorAll('dialog.sheet[open]').forEach((d) => d.close());
});
