// Place search and reverse lookup via OpenStreetMap Nominatim.
// Usage policy: max ~1 request/second, no autocomplete — so searches only run
// when the user presses "Find" or saves.
import { fetchJSON } from './http.js';

const BASE = 'https://nominatim.openstreetmap.org';

function normalize(r) {
  const a = r.address || {};
  const city = a.city || a.town || a.village || a.municipality || a.hamlet || a.suburb || a.county || a.state || r.name || '';
  return {
    lat: Number(r.lat),
    lon: Number(r.lon),
    label: r.display_name,
    name: r.name || city,
    city,
    region: a.state || a.region || a.province || a.county || '',
    countryName: a.country || '',
    countryCode: String(a.country_code || '').toUpperCase(),
  };
}

export async function searchPlace(country, place) {
  const q = [place, country].map((s) => String(s || '').trim()).filter(Boolean).join(', ');
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=5&accept-language=en&q=${encodeURIComponent(q)}`;
  const rows = (await fetchJSON(url)) || [];
  return rows.map(normalize).filter((r) => r.countryCode);
}

export async function reversePlace(lat, lon) {
  const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=en&lat=${lat}&lon=${lon}`;
  const row = await fetchJSON(url);
  if (!row || row.error) return null;
  const n = normalize(row);
  n.lat = lat;
  n.lon = lon;
  return n;
}
