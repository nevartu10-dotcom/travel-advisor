# Travel Advisor

A progressive web app that turns each trip into an advisory card. Add a destination and dates, and the card shows what you need to know before you go.

**Live app:** https://nevartu10-dotcom.github.io/travel-advisor/ (open on your phone and choose *Add to Home Screen* / *Install app*).

## What it does

- **Two tabs:** trips as pins on a map, and trips as a list.
- **Open a card** by tapping a pin or a list item.
- **Add a trip** by typing an address or city in the search bar on the map, with the + button in the list, or by tapping a spot on the map. From search or a map tap, the place is filled in for you and only the dates are left.
- Each trip needs a country, a city or address, and arrival and departure dates.

Each card shows:

| Topic | Where it comes from |
| --- | --- |
| Languages spoken | Built-in table of official and widely spoken languages per country |
| Weather for the trip dates | [Open-Meteo](https://open-meteo.com): daily forecast up to 16 days ahead; for trips further out, the weather on the same dates last year |
| Power plugs and voltage | Built-in table (IEC plug types), with a check against Finnish C/F plugs |
| Safety (max 100 words) | Official advisories from the [U.S. State Department](https://travel.state.gov) and [Government of Canada](https://travel.gc.ca); sentences that mention your city or region are shown first |
| Top 5 restaurants nearby | [OpenStreetMap](https://www.openstreetmap.org) via Overpass, within 1.5 km |
| Top 5 sights nearby | OpenStreetMap via Overpass, within 8 km |
| Top 5 news headlines (max 150 words) | [GDELT](https://www.gdeltproject.org): English-language coverage of the country from the last 3 days |
| Public holidays and observances during the visit | [Nager.Date](https://date.nager.at) |
| Numbers 1–10 and basic words (hello, good morning, good day, good night, please, thank you, goodbye, yes, no) | Built-in phrasebook for ~45 languages with romanization for non-Latin scripts; other languages are machine-translated with [MyMemory](https://mymemory.translated.net) and labelled as such |

## Data and privacy

- **Only your trip cards are stored**, in your browser's local storage on your device. There is no account and no server of our own.
- Everything inside a card is fetched live from the public services above each time you open it.
- For offline use while travelling, the service worker keeps the app itself, map tiles you've viewed, and the most recent answer from each service. Fresh data is always tried first.
- Languages, plug types and phrases are stable reference data, so they ship with the app instead of being fetched. (restcountries.com, used at first, now requires a private API key, which can't be kept secret in a web app.)

## Known limitations

- **Restaurants and sights** are ranked by how notable they are in OpenStreetMap (Wikipedia entry, heritage status, completeness) and distance. OSM has no ratings, so tap a name to see reviews in Google Maps.
- **Safety** is only as local as the official advisory text. When the advisory doesn't mention your city or region, the card says so and shows the country-wide advice.
- **Flag days** that aren't public holidays may be missing; Nager.Date covers public holidays and some observances for about 120 countries.
- **News** depends on GDELT's coverage; country names that are also common words (e.g. Chad, Jordan, Georgia) can bring unrelated headlines.
- The free services have fair-use limits (e.g. Nominatim: about one search per second). Fine for personal use.

## Run locally

No build step. Serve the folder over HTTP:

```sh
python3 -m http.server 8765
# open http://localhost:8765
```

## Tests

End-to-end test with all external services mocked (needs Python Playwright):

```sh
python3 -m http.server 8765 &
python3 tests/e2e.py              # add --shots DIR to save screenshots
```

## Project layout

```
index.html              App shell
css/app.css             Styles (light and dark)
js/app.js               Tabs, list, wiring
js/map.js               Leaflet map, pins, tap-to-add
js/form.js              New trip form
js/detail.js            Trip card with the nine topics
js/store.js             Local storage for trip cards
js/api/*.js             One module per data source
js/data/plugs.js        Plug types by country
js/data/phrasebook.js   Numbers and phrases by language
sw.js                   Service worker (offline + install)
vendor/leaflet/         Leaflet 1.9.4 (BSD-2), ES module source
```
