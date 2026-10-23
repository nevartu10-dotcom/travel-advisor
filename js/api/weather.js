// Weather for the trip dates from Open-Meteo (no key needed).
// - Trip within the next 16 days: daily forecast.
// - Trip further out: what the weather was on the same dates last year.
// - Trip in the past: recorded weather.
import { fetchJSON, remember } from './http.js';

const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => new Date(s + 'T00:00:00Z');
const addDays = (s, n) => iso(new Date(parse(s).getTime() + n * DAY));
export const todayISO = () => {
  const d = new Date();
  return iso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
};

function shiftYear(s, by) {
  const [y, m, d] = s.split('-').map(Number);
  const day = m === 2 && d === 29 ? 28 : d;
  return `${y + by}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const CODES = [
  [[0], '☀️', 'Clear'], [[1], '🌤️', 'Mostly clear'], [[2], '⛅', 'Partly cloudy'], [[3], '☁️', 'Overcast'],
  [[45, 48], '🌫️', 'Fog'], [[51, 53, 55, 56, 57], '🌦️', 'Drizzle'], [[61, 63, 65, 66, 67], '🌧️', 'Rain'],
  [[71, 73, 75, 77], '🌨️', 'Snow'], [[80, 81, 82], '🌦️', 'Showers'], [[85, 86], '🌨️', 'Snow showers'],
  [[95, 96, 99], '⛈️', 'Thunderstorm'],
];
export function describeCode(code) {
  const row = CODES.find(([list]) => list.includes(code));
  return row ? { icon: row[1], text: row[2] } : { icon: '·', text: 'No data' };
}

const MAX_DAYS = 16;

export function getWeather(lat, lon, arrival, departure) {
  return remember(`weather:${lat},${lon},${arrival},${departure}`, async () => {
    const today = todayISO();
    const lastForecastDay = addDays(today, MAX_DAYS - 1);
    let mode, start, end, note = '';

    if (departure < today) {
      mode = 'recorded';
      start = arrival;
      end = departure < addDays(arrival, MAX_DAYS - 1) ? departure : addDays(arrival, MAX_DAYS - 1);
    } else if (arrival > lastForecastDay) {
      mode = 'lastYear';
      start = arrival;
      end = departure < addDays(arrival, MAX_DAYS - 1) ? departure : addDays(arrival, MAX_DAYS - 1);
      const opens = addDays(arrival, -(MAX_DAYS - 1));
      note = `The forecast opens about ${Math.ceil((parse(opens) - parse(today)) / DAY)} days from now. Until then, this is what the weather was on the same dates last year.`;
    } else {
      mode = 'forecast';
      start = arrival < today ? today : arrival;
      end = departure > lastForecastDay ? lastForecastDay : departure;
      if (departure > lastForecastDay) note = `Forecast runs to ${end}; later days appear as the date gets closer.`;
    }

    const daily = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum';
    let url;
    if (mode === 'forecast') {
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${daily},precipitation_probability_max&timezone=auto&start_date=${start}&end_date=${end}`;
    } else {
      const s = mode === 'lastYear' ? shiftYear(start, -1) : start;
      const e = mode === 'lastYear' ? shiftYear(end, -1) : end;
      url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=${daily}&timezone=auto&start_date=${s}&end_date=${e}`;
    }
    const data = await fetchJSON(url);
    const d = data?.daily;
    if (!d?.time?.length) throw new Error('No weather data for these dates');

    const days = d.time.map((t, i) => ({
      date: mode === 'lastYear' ? shiftYear(t, 1) : t,
      ...describeCode(d.weather_code?.[i]),
      max: d.temperature_2m_max?.[i],
      min: d.temperature_2m_min?.[i],
      rain: d.precipitation_sum?.[i],
      rainChance: d.precipitation_probability_max?.[i] ?? null,
    }));
    return { mode, days, note };
  });
}
