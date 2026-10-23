// Top 5 sights near the destination, from Wikipedia.
// Articles with coordinates within 10 km are ranked by how many people read them in
// the last 30 days (a good popularity signal), lightly weighted by distance.
// Places that aren't sights (districts, streets, stations, schools…) are filtered out
// using each article's short description.
import { fetchJSON, remember } from './http.js';

const API = 'https://en.wikipedia.org/w/api.php';

const NOT_A_SIGHT = new RegExp(
  [
    'human settlement', 'settlement', 'municipality', 'civil parish', 'parish', 'freguesia', 'district', 'neighbou?rhood',
    'borough', 'suburb', 'quarter of', 'ward', 'city in', 'city of', 'town in', 'village', 'capital (city )?of', 'country in',
    'region', 'county', 'province', 'state of', 'street', 'avenue', 'road', 'highway', 'motorway', 'railway', 'metro station',
    'train station', 'railway station', 'bus station', 'tram stop', 'station', 'school', 'university', 'college', 'hospital',
    'company', 'business', 'corporation', 'bank', 'club', 'football', 'sports team', 'airport', 'newspaper', 'radio', 'television',
    'organi[sz]ation', 'agency', 'embassy', 'ministry', 'government', 'court', 'electoral', 'constituency', 'list of', 'wikimedia',
    'politician', 'footballer', 'actor', 'singer', 'born', 'disambiguation', 'former ', 'defunct', 'demolished', 'hotel',
    'shopping', 'office building', 'skyscraper under', 'residential', 'apartment', 'housing', 'research', 'institute',
  ].join('|'),
  'i'
);

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function getSights(lat, lon, excludeNames = []) {
  return remember(`sights:${lat},${lon}`, async () => {
    const params = new URLSearchParams({
      action: 'query', format: 'json', origin: '*', formatversion: '2',
      generator: 'geosearch', ggscoord: `${lat}|${lon}`, ggsradius: '10000', ggslimit: '50', ggsnamespace: '0',
      prop: 'pageviews|description|pageimages|coordinates',
      pvipdays: '30', piprop: 'thumbnail', pithumbsize: '160', pilimit: '50', colimit: '50',
    });
    // Page views can arrive in batches ("continue"); merge up to a few follow-ups.
    const byId = new Map();
    let cont = {};
    for (let i = 0; i < 4; i++) {
      const data = await fetchJSON(`${API}?${new URLSearchParams({ ...Object.fromEntries(params), ...cont })}`);
      for (const p of data?.query?.pages || []) {
        const prev = byId.get(p.pageid) || {};
        byId.set(p.pageid, { ...prev, ...p, pageviews: { ...(prev.pageviews || {}), ...(p.pageviews || {}) } });
      }
      if (!data?.continue) break;
      cont = data.continue;
    }
    const pages = [...byId.values()];
    const skip = new Set(excludeNames.filter(Boolean).map((n) => n.toLowerCase()));

    const list = pages
      .filter((p) => p.title && !skip.has(p.title.toLowerCase()))
      .filter((p) => !p.description || !NOT_A_SIGHT.test(p.description))
      .map((p) => {
        const c = p.coordinates?.[0];
        const views = Object.values(p.pageviews || {}).reduce((s, v) => s + (v || 0), 0);
        const dist = c ? distance(lat, lon, c.lat, c.lon) : Infinity;
        return {
          name: p.title,
          detail: p.description ? p.description.charAt(0).toUpperCase() + p.description.slice(1) : '',
          image: p.thumbnail?.source || '',
          distance: dist,
          views,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
          score: views / (1 + dist / 5000),
        };
      })
      .filter((p) => p.views > 0)
      .sort((a, b) => b.score - a.score);

    return list.slice(0, 5);
  });
}
