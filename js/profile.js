// The user's profile: stored only on this device (and in backup files), like the trips.
import { setMeta } from './store.js';
import { currencyFor } from './data/currencies.js';
import { countryLanguages } from './data/languages.js';
import { welcomeWord } from './data/welcome.js';
import { birthdayGreeting } from './data/birthday.js';

const KEY = 'travel-advisor.profile.v1';
const listeners = new Set();

export const GENDERS = ['', 'female', 'male', 'other', 'none'];

export function getProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export function saveProfile(p) {
  const clean = cleanProfile(p);
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
    setMeta({ lastChange: Date.now() });
  } catch (err) {
    console.warn('Could not save profile', err);
  }
  listeners.forEach((fn) => fn(clean));
  return clean;
}

export function onProfileChange(fn) {
  listeners.add(fn);
}

export function hasProfile(p = getProfile()) {
  return !!(p.name || p.home);
}

/** Keep only known fields with sane values (also used when restoring a backup). */
export function cleanProfile(p = {}) {
  const out = {};
  const str = (v, max = 200) => (v == null ? '' : String(v).slice(0, max).trim());
  if (str(p.name)) out.name = str(p.name, 80);
  if (str(p.address)) out.address = str(p.address);
  if (validBirthDate(p.birthDate)) out.birthDate = p.birthDate;
  if (GENDERS.includes(p.gender) && p.gender) out.gender = p.gender;
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.passportExpiry || '')) out.passportExpiry = p.passportExpiry;
  if (typeof p.lang === 'string' && /^[a-z]{2}$/.test(p.lang)) out.lang = p.lang;
  const h = p.home;
  if (h && /^[A-Za-z]{2}$/.test(h.countryCode || '')) {
    out.home = {
      countryCode: h.countryCode.toUpperCase(),
      countryName: str(h.countryName, 80),
      city: str(h.city, 80),
      label: str(h.label, 300),
      lat: Number(h.lat) || 0,
      lon: Number(h.lon) || 0,
    };
    out.currency = currencyFor(out.home.countryCode);
  }
  return out;
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A real date between 1900 and today. */
export function validBirthDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(s + 'T00:00:00');
  return !Number.isNaN(d.getTime()) && s >= '1900-01-01' && s <= todayISO();
}

/** Age in whole years on a given day (default: today). */
export function ageOn(birthDate, on = todayISO()) {
  if (!validBirthDate(birthDate)) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = on.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** True on the birthday (29 February birthdays are celebrated on 28 February in other years). */
export function isBirthday(birthDate, on = todayISO()) {
  if (!validBirthDate(birthDate)) return false;
  const [, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = on.split('-').map(Number);
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  if (bm === 2 && bd === 29 && !leap) return m === 2 && d === 28;
  return m === bm && d === bd;
}

/** "Happy birthday" in the home language, or null if we don't have that language. */
export function homeBirthday(p = getProfile()) {
  const code = homeLanguage(p);
  return code ? birthdayGreeting(code, (p.name || '').split(/\s+/)[0]) : null;
}

/** Main language of the home country (ISO 639-3), e.g. 'fin' for Finland. */
export function homeLanguage(p = getProfile()) {
  return p.home ? countryLanguages(p.home.countryCode)[0]?.code || null : null;
}

/** "Welcome" in the home language, or null if we don't have that language. */
export function homeWelcome(p = getProfile()) {
  const code = homeLanguage(p);
  return code ? welcomeWord(code, p.gender) : null;
}

/** Passport status for a trip (or in general when no trip is given). */
export function passportStatus(p, trip) {
  const exp = p?.passportExpiry;
  if (!exp) return null;
  const today = new Date().toISOString().slice(0, 10);
  const addMonths = (iso, m) => {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + m);
    return d.toISOString().slice(0, 10);
  };
  if (trip) {
    if (exp < trip.departure) return 'expired';
    if (exp < addMonths(trip.departure, 6)) return 'soon';
    return 'ok';
  }
  if (exp < today) return 'expired';
  if (exp < addMonths(today, 6)) return 'soon';
  return 'ok';
}
