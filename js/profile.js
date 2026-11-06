// The user's profile: stored only on this device (and in backup files), like the trips.
import { setMeta } from './store.js';
import { currencyFor } from './data/currencies.js';
import { countryLanguages } from './data/languages.js';
import { welcomeWord } from './data/welcome.js';

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
  const age = Number(p.age);
  if (p.age !== '' && p.age != null && Number.isInteger(age) && age >= 0 && age <= 120) out.age = age;
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
