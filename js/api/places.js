// Restaurants near the destination, from OpenStreetMap (Overpass API).
// OSM has no ratings, so "top" is ranked by how notable a place is in the map
// data (Wikipedia/Wikidata entry, heritage status, completeness) and distance.
import { fetchJSON, remember } from './http.js';

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

async function overpass(query) {
  let lastErr;
  for (const url of MIRRORS) {
    try {
      return await fetchJSON(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        timeout: 30000,
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function toPlace(el, lat, lon) {
  const t = el.tags || {};
  const plat = el.lat ?? el.center?.lat;
  const plon = el.lon ?? el.center?.lon;
  return {
    id: `${el.type}/${el.id}`,
    name: t['name:en'] || t.name,
    tags: t,
    lat: plat,
    lon: plon,
    distance: plat != null ? distance(lat, lon, plat, plon) : Infinity,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.name} ${plat},${plon}`)}`,
  };
}

const pretty = (s) => String(s || '').replace(/_/g, ' ').replace(/;/g, ', ');

function dedupe(list) {
  const seen = new Set();
  return list.filter((p) => {
    const k = p.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function getRestaurants(lat, lon) {
  return remember(`food:${lat},${lon}`, async () => {
    const q = `[out:json][timeout:25];nwr["amenity"="restaurant"]["name"](around:1500,${lat},${lon});out center tags 150;`;
    const data = await overpass(q);
    const list = (data?.elements || []).map((e) => toPlace(e, lat, lon)).filter((p) => p.name);
    const score = (p) => {
      const t = p.tags;
      return (t.wikidata || t.wikipedia ? 3 : 0) + (t.website || t['contact:website'] ? 1 : 0) + (t.cuisine ? 0.5 : 0) + (t.opening_hours ? 0.5 : 0) - p.distance / 600;
    };
    return dedupe(list.sort((a, b) => score(b) - score(a))).slice(0, 5).map((p) => ({
      ...p,
      detail: [pretty(p.tags.cuisine), p.tags.opening_hours ? 'hours listed' : ''].filter(Boolean).join(', '),
    }));
  });
}
