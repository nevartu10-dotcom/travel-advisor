// Profile page: name, home address (→ country and currency), age, gender,
// passport expiry and app language.
import { getProfile, saveProfile, passportStatus } from './profile.js';
import { searchPlace } from './api/geocode.js';
import { currencyFor } from './data/currencies.js';
import { flagEmoji } from './api/country.js';
import { t, tp, lang, LANGUAGES, countryName, currencyName, longDate } from './i18n.js';
import { esc, openSheet, closeSheet, toast, isPast } from './ui.js';
import { getCards } from './store.js';

const $ = (id) => document.getElementById(id);
let home = null; // confirmed home place for the address in the field
let confirmedAddress = '';

function homeLine(h) {
  return `${flagEmoji(h.countryCode)} ${[h.city, countryName(h.countryCode, h.countryName)].filter(Boolean).join(', ')}`;
}

function showHome() {
  $('p-home').textContent = home ? t('profile.addrFound', { place: homeLine(home) }) : '';
  const code = home ? currencyFor(home.countryCode) : '';
  $('p-currency').innerHTML = code
    ? `<strong>${esc(currencyName(code))} (${esc(code)})</strong><span class="field-note muted">${esc(t('profile.currencyAuto'))}</span>`
    : `<span class="muted">${esc(t('profile.currencyNone'))}</span>`;
}

function showPassport() {
  const v = $('p-passport').value;
  const s = passportStatus({ passportExpiry: v });
  const el = $('p-passport-status');
  el.className = `field-note ${s === 'ok' ? 'ok' : s ? 'warn' : ''}`;
  el.textContent = s ? t(`pass.${s}`, { date: longDate(v) }) : '';
}

async function findHome() {
  const q = $('p-address').value.trim();
  if (!q) {
    home = null;
    confirmedAddress = '';
    showHome();
    return true;
  }
  $('p-home').textContent = t('profile.addrSearching');
  try {
    const [first] = await searchPlace('', q);
    if (!first) throw new Error('none');
    home = { countryCode: first.countryCode, countryName: first.countryName, city: first.city, label: first.label, lat: first.lat, lon: first.lon };
    confirmedAddress = q;
    showHome();
    return true;
  } catch {
    $('p-home').textContent = t('profile.addrNotFound');
    return false;
  }
}

/** Holiday and business trips, done and coming (ongoing trips count as coming). */
export function tripStats(cards = getCards()) {
  const s = { holiday: { done: 0, coming: 0 }, business: { done: 0, coming: 0 }, untyped: 0 };
  for (const c of cards) {
    if (c.type !== 'holiday' && c.type !== 'business') {
      s.untyped++;
      continue;
    }
    s[c.type][isPast(c) ? 'done' : 'coming']++;
  }
  return s;
}

function renderStats() {
  const cards = getCards();
  const box = $('p-stats');
  if (!cards.length) {
    box.innerHTML = `<h3 id="p-stats-title">${esc(t('profile.stats'))}</h3><p class="muted">${esc(t('stats.none'))}</p>`;
    return;
  }
  const st = tripStats(cards);
  const cell = (n) => `<td class="${n ? '' : 'zero'}">${n}</td>`;
  box.innerHTML = `
    <h3 id="p-stats-title">${esc(t('profile.stats'))}</h3>
    <table class="stats-table">
      <thead><tr><th scope="col"></th><th scope="col">${esc(t('stats.done'))}</th><th scope="col">${esc(t('stats.coming'))}</th></tr></thead>
      <tbody>
        <tr><th scope="row">🏖️ ${esc(t('type.holiday'))}</th>${cell(st.holiday.done)}${cell(st.holiday.coming)}</tr>
        <tr><th scope="row">💼 ${esc(t('type.business'))}</th>${cell(st.business.done)}${cell(st.business.coming)}</tr>
      </tbody>
    </table>
    ${st.untyped ? `<p class="field-note muted">${esc(tp('stats.untyped', st.untyped))}</p>` : ''}`;
}

export function openProfile() {
  renderStats();
  const p = getProfile();
  $('p-name').value = p.name || '';
  $('p-address').value = p.address || '';
  $('p-age').value = p.age ?? '';
  $('p-gender').value = p.gender || '';
  $('p-passport').value = p.passportExpiry || '';
  $('p-lang').value = p.lang || lang;
  $('p-error').textContent = '';
  home = p.home || null;
  confirmedAddress = home ? p.address || '' : '';
  showHome();
  showPassport();
  openSheet($('profile-sheet'));
}

export function initProfile({ saved }) {
  const sheet = $('profile-sheet');
  $('p-lang').innerHTML = LANGUAGES.map((l) => `<option value="${l.code}">${esc(l.name)}</option>`).join('');
  sheet.querySelector('[data-close]').addEventListener('click', () => closeSheet(sheet));
  sheet.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet(sheet);
  });
  $('p-find').addEventListener('click', findHome);
  $('p-address').addEventListener('input', () => {
    if ($('p-address').value.trim() !== confirmedAddress) {
      $('p-home').textContent = $('p-address').value.trim() ? t('profile.addrNeedFind') : '';
    } else showHome();
  });
  $('p-passport').addEventListener('input', showPassport);

  $('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('p-error');
    err.textContent = '';
    const ageRaw = $('p-age').value.trim();
    const age = ageRaw === '' ? '' : Number(ageRaw);
    if (ageRaw !== '' && !(Number.isInteger(age) && age >= 0 && age <= 120)) {
      err.textContent = t('profile.ageInvalid');
      return;
    }
    const btn = $('p-save');
    btn.disabled = true;
    try {
      // Confirm the address if it changed since the last lookup.
      if ($('p-address').value.trim() !== confirmedAddress && !(await findHome())) {
        err.textContent = t('profile.addrNotFound');
        return;
      }
      const before = getProfile();
      const p = saveProfile({
        ...before,
        name: $('p-name').value,
        address: $('p-address').value,
        home: $('p-address').value.trim() ? home : null,
        age,
        gender: $('p-gender').value,
        passportExpiry: $('p-passport').value,
        lang: $('p-lang').value,
      });
      closeSheet(sheet);
      if ((p.lang || lang) !== lang) {
        // Switching language: reload so every part of the app uses it.
        setTimeout(() => location.reload(), 50);
        return;
      }
      toast(t('profile.saved'));
      saved(p);
    } finally {
      btn.disabled = false;
    }
  });
}
