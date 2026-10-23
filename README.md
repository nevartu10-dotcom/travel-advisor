# Travel Advisor

A progressive web app that turns each trip into an advisory card. Add a destination and dates, and the card shows what you need to know before you go.

**Live app:** https://nevartu10-dotcom.github.io/travel-advisor/ (open on your phone and choose *Add to Home Screen* / *Install app*).

## What it does

- **Two tabs:** trips as pins on a map, and trips as a list.
- **Open a card** by tapping a pin or a list item.
- **Add a trip** by typing an address or city in the search bar on the map, with the + button in the list, or by tapping a spot on the map. From search or a map tap, the place is filled in for you and only the dates are left.
- Each trip needs a country, a city or address, and arrival and departure dates. You can also give it a name (e.g. "Family summer holiday"), now or later from the card; the name shows above the pin on the map and as the title in the list.

Each card shows:

| Topic | Where it comes from |
| --- | --- |
| Languages spoken | Built-in table of official and widely spoken languages per country |
| Weather for the trip dates | [Open-Meteo](https://open-meteo.com): daily forecast up to 16 days ahead; for trips further out, the weather on the same dates last year |
| Power plugs and voltage | Built-in table (IEC plug types), with a check against Finnish C/F plugs |
| Safety (max 100 words) | The "Stay safe" sections of [Wikivoyage](https://en.wikivoyage.org)'s city and country guides; the official U.S./Canadian advisory level when their servers allow it; plus up to 3 recent safety-related headlines from GDELT, shown as context rather than a rating |
| Top 5 restaurants nearby | [OpenStreetMap](https://www.openstreetmap.org) via Overpass (two servers), within 1.2 km; falls back to OpenStreetMap's Nominatim search when Overpass is busy |
| Top 5 sights nearby | [Wikipedia](https://en.wikipedia.org): places with articles within 10 km, ranked by how many people read them in the last 30 days (weighted by distance), with photo and short description |
| Top 5 news headlines (max 150 words) | [Google News](https://news.google.com) search in English for the last 3 days, read through [rss2json.com](https://rss2json.com) (a free feed converter); falls back to [GDELT](https://www.gdeltproject.org). Headlines must name the country, its people (e.g. "Portuguese") or the city |
| Public holidays and observances during the visit | [Nager.Date](https://date.nager.at) |
| Numbers 1–10 and basic words (hello, good morning, good day, good night, please, thank you, goodbye, yes, no) | Built-in phrasebook for ~45 languages with romanization for non-Latin scripts; other languages are machine-translated with [MyMemory](https://mymemory.translated.net) and labelled as such |
| My notes (max 500 words) | Your own text, saved automatically on your device with the card |

## Data and privacy

- **Only your trip cards (including your notes) are stored**, in your browser's local storage on your device. There is no account and no server of our own.
- Everything inside a card is fetched live from the public services above each time you open it.
- For offline use while travelling, the service worker keeps the app itself, map tiles you've viewed, and the most recent answer from each service. Fresh data is always tried first.
- Languages, plug types and phrases are stable reference data, so they ship with the app instead of being fetched. (restcountries.com, used at first, now requires a private API key, which can't be kept secret in a web app.)

## Known limitations

- **Restaurants** are ranked by how notable they are in OpenStreetMap and distance; OSM has no ratings, so tap a name to see reviews in Google Maps. **Sights** depend on Wikipedia coverage, so small towns may show few.
- **Safety** text comes from Wikivoyage, which is traveller-written and not updated in real time. The U.S. and Canadian advisory servers usually refuse requests from web pages, so the official level often won't show; the card links to um.fi for official Finnish advice. Headlines are not turned into a score, because news over-reports bad events.
- **Flag days** that aren't public holidays may be missing; Nager.Date covers public holidays and some observances for about 120 countries.
- **News** relies on rss2json.com relaying the Google News feed (it sees only the search, e.g. the country name) and GDELT as a backup; GDELT can be slow. Headline filtering removes passing mentions but can also hide stories phrased differently.
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
