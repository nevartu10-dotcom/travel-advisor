// Restaurants and sights near the destination, from OpenStreetMap (Overpass API).
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

const SIGHT_WEIGHT = { museum: 1.5, attraction: 1.2, castle: 1.5, palace: 1.5, cathedral: 1.2, gallery: 1, viewpoint: 1, zoo: 1, aquarium: 1, theme_park: 1, monument: 0.8, fort: 1, ruins: 0.8, archaeological_site: 1 };

export function getSights(lat, lon) {
  return remember(`sights:${lat},${lon}`, async () => {
    const r = 8000;
    const q = `[out:json][timeout:25];(
nwr["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|aquarium|theme_park)$"]["name"](around:${r},${lat},${lon});
nwr["historic"~"^(castle|palace|fort|monument|ruins|archaeological_site)$"]["name"](around:${r},${lat},${lon});
nwr["building"="cathedral"]["name"](around:${r},${lat},${lon});
);out center tags 300;`;
    const data = await overpass(q);
    const list = (data?.elements || []).map((e) => toPlace(e, lat, lon)).filter((p) => p.name);
    const kind = (t) => t.tourism || t.historic || (t.building === 'cathedral' ? 'cathedral' : '');
    const score = (p) => {
      const t = p.tags;
      return (t.wikipedia ? 4 : t.wikidata ? 3 : 0) + (t.heritage ? 1 : 0) + (SIGHT_WEIGHT[kind(t)] || 0.5) - p.distance / 3000;
    };
    return dedupe(list.sort((a, b) => score(b) - score(a))).slice(0, 5).map((p) => ({
      ...p,
      detail: pretty(kind(p.tags)),
    }));
  });
}
