// Restaurants near the destination, from OpenStreetMap.
//
// 1. Overpass API (two public servers, tried in turn with a short timeout). These are
//    run by volunteers and are often busy, so they fail now and then.
// 2. Fallback: Nominatim, OpenStreetMap's search service, which can also find
//    restaurants inside a small box around the destination.
//
// OSM has no ratings, so "top" is ranked by how complete and notable a place is in the
// map data and by distance.
import { fetchJSON, remember } from './http.js';

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const pretty = (s) => String(s || '').replace(/_/g, ' ').replace(/;/g, ', ');
const mapsUrl = (name, lat, lon) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lon}`)}`;

function dedupe(list) {
  const seen = new Set();
  return list.filter((p) => {
    const k = p.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function rank(list) {
  const score = (p) => {
    const t = p.tags;
    return (t.wikidata || t.wikipedia ? 3 : 0) + (t.website || t['contact:website'] ? 1 : 0) + (t.cuisine ? 0.5 : 0) + (t.opening_hours ? 0.5 : 0) + (p.importance || 0) * 4 - p.distance / 600;
  };
  return dedupe(list.filter((p) => p.name && Number.isFinite(p.distance)).sort((a, b) => score(b) - score(a)))
    .slice(0, 5)
    .map((p) => ({
      ...p,
      detail: [pretty(p.tags.cuisine), p.tags.opening_hours ? 'hours listed' : ''].filter(Boolean).join(', '),
      mapUrl: mapsUrl(p.name, p.lat, p.lon),
    }));
}

async function fromOverpass(lat, lon) {
  const q = `[out:json][timeout:12];nwr["amenity"="restaurant"]["name"](around:1200,${lat},${lon});out center tags 80;`;
  let lastErr;
  for (const base of OVERPASS) {
    try {
      // GET (not POST) so the service worker can keep the last answer for offline use.
      const data = await fetchJSON(`${base}?data=${encodeURIComponent(q)}`, { timeout: 12000 });
      if (!Array.isArray(data?.elements)) throw new Error('unexpected answer');
      return data.elements.map((el) => {
        const t = el.tags || {};
        const plat = el.lat ?? el.center?.lat;
        const plon = el.lon ?? el.center?.lon;
        return { name: t['name:en'] || t.name, tags: t, lat: plat, lon: plon, distance: plat != null ? distance(lat, lon, plat, plon) : Infinity };
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function fromNominatim(lat, lon) {
  const d = 0.012; // about 1.3 km
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=restaurant&bounded=1&limit=30&extratags=1&accept-language=en&viewbox=${lon - d},${lat + d},${lon + d},${lat - d}`;
  const rows = (await fetchJSON(url, { timeout: 12000 })) || [];
  return rows
    .filter((r) => r.type === 'restaurant' || r.category === 'amenity')
    .map((r) => ({
      name: r.name,
      tags: r.extratags || {},
      lat: Number(r.lat),
      lon: Number(r.lon),
      importance: Number(r.importance) || 0,
      distance: distance(lat, lon, Number(r.lat), Number(r.lon)),
    }));
}

export function getRestaurants(lat, lon) {
  return remember(`food:${lat},${lon}`, async () => {
    let list = [];
    let overpassErr;
    try {
      list = await fromOverpass(lat, lon);
    } catch (err) {
      overpassErr = err;
    }
    if (rank(list).length < 5) {
      // Overpass failed or found too few: top up from Nominatim.
      try {
        list = [...list, ...(await fromNominatim(lat, lon))];
      } catch (err) {
        if (overpassErr) throw new Error('The restaurant search services are busy right now. Try again in a minute');
      }
    }
    return rank(list);
  });
}
