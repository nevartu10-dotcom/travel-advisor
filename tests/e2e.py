"""End-to-end test with mocked network.

Run:  python3 -m http.server 8765  (from repo root, in another shell)
      python3 tests/e2e.py [--shots DIR]
Every external service is mocked, so this checks the app's own behaviour, not the APIs.
"""
import json, sys, datetime, pathlib, re, base64
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8765/'
SHOTS = pathlib.Path(sys.argv[sys.argv.index('--shots') + 1]) if '--shots' in sys.argv else None
today = datetime.date.today()
ARR = today + datetime.timedelta(days=5)
DEP = today + datetime.timedelta(days=10)
HOL = today + datetime.timedelta(days=7)
FAIL_OVERPASS = [False]
DOWN = set()  # services to simulate as unreachable
MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
_d = datetime.date.today(); _y = _d - datetime.timedelta(days=1)
CE_TODAY = f'Portal:Current events/{_d.year} {MONTHS[_d.month-1]} {_d.day}'
CE_YESTERDAY = f'Portal:Current events/{_y.year} {MONTHS[_y.month-1]} {_y.day}'
WIKI_PAGES = {CE_TODAY: "{{Current events|year=2026|month=10|day=23|content=\n<!-- All news items below this line -->\n'''Armed conflicts and attacks'''\n*[[Kashmir conflict]]\n**Pakistani and Indian troops exchange fire along the Line of Control. [https://www.reuters.com/a (Reuters)]\n'''Disasters and accidents'''\n*[[2026 Portugal wildfires]]\n**A wildfire in central Portugal is brought under control after three days. [https://apnews.com/b (AP)]\n'''Law and crime'''\n*Lisbon police arrest a gang targeting tourists on tram 28. [https://www.publico.pt/c (Público)]\n'''Politics and elections'''\n*[[2026 Pakistani budget]]\n**The Pakistani cabinet approves a new budget amid IMF talks. [https://www.dawn.com/d (Dawn)]\n*The Portuguese parliament approves a housing bill limiting short-term rentals. [https://www.politico.eu/e (Politico)]\n<!-- All news items above this line -->\n}}", CE_YESTERDAY: "{{Current events|content=\n'''Business and economy'''\n*[[Rail transport in Portugal]]\n**Portugal unveils a new high-speed rail timetable between Lisbon and Porto. [https://www.euronews.com/f (Euronews)]\n'''Sports'''\n*Japan wins the Asian volleyball championship final in Tokyo. [https://www.bbc.co.uk/g (BBC)]\n}}", f'{_d.year} in Portugal': 'Intro.\n== Incumbents ==\n* President: someone\n== Events ==\n=== September ===\n* 12 September – An older event that should rank below newer ones in the list.\n=== October ===\n* 2 October – The government announces record tourism numbers for the summer season.\n* 20 October – Metro workers in the capital hold a one-day strike over pay.\n== Deaths ==\n* 1 October – Someone'}
TILE = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN89+7dfwAJbgPePoT6KwAAAABJRU5ErkJggg==')

LISBON = {"lat": "38.7077", "lon": "-9.1366", "name": "Lisbon", "display_name": "Lisbon, Lisboa, Portugal",
          "address": {"city": "Lisbon", "state": "Lisboa", "country": "Portugal", "country_code": "pt"}}

def days(start, n):
    return [(start + datetime.timedelta(days=i)).isoformat() for i in range(n)]

def handler(route):
    url = route.request.url
    j = lambda obj: route.fulfill(status=200, content_type='application/json', body=json.dumps(obj), headers={'Access-Control-Allow-Origin': '*'})
    if 'nominatim' in url and '/search' in url and 'q=restaurant' in url:
        return j([{"name": n, "lat": str(38.70 + i * 0.001), "lon": "-9.10", "type": "restaurant", "category": "amenity", "importance": 0.1, "extratags": {"cuisine": "portuguese"}}
                  for i, n in enumerate(["Fallback Tasca", "Fallback Marisqueira", "Fallback Café", "Fallback Grill", "Fallback Bistro", "Fallback Sushi"])])
    if 'nominatim' in url and '/search' in url:
        return j([LISBON, {**LISBON, "lat": "38.72", "display_name": "Lisbon district, Portugal", "address": {**LISBON["address"], "city": "Lisbon District"}}])
    if 'nominatim' in url and '/reverse' in url:
        return j({**LISBON, "address": {"town": "Porto", "state": "Porto", "country": "Portugal", "country_code": "pt"}})
    if 'restcountries' in url:
        print('UNEXPECTED restcountries call')
        return j({"name": {"common": "Portugal", "official": "Portuguese Republic"}, "cca2": "PT", "altSpellings": ["PT", "Portuguesa"],
                  "languages": {"por": "Portuguese", "eng": "English"}, "capital": ["Lisbon"], "currencies": {"EUR": {"name": "Euro", "symbol": "€"}}})
    if 'open-meteo' in url:
        s = re.search(r'start_date=([\d-]+)', url).group(1); e = re.search(r'end_date=([\d-]+)', url).group(1)
        n = (datetime.date.fromisoformat(e) - datetime.date.fromisoformat(s)).days + 1
        d = days(datetime.date.fromisoformat(s), n)
        return j({"daily": {"time": d, "weather_code": [0, 2, 61, 3, 80, 1, 95][:n] + [0] * max(0, n - 7),
                            "temperature_2m_max": [21 + i % 4 for i in range(n)], "temperature_2m_min": [13 + i % 3 for i in range(n)],
                            "precipitation_sum": [0, 0, 4.2, 0, 1.5, 0, 8][:n] + [0] * max(0, n - 7),
                            "precipitation_probability_max": [5, 10, 80, 20, 60, 5, 90][:n] + [0] * max(0, n - 7)}})
    if 'date.nager.at' in url:
        return j([{"date": HOL.isoformat(), "localName": "Dia da Restauração da Independência", "name": "Restoration of Independence", "types": ["Public"], "counties": None},
                  {"date": "2001-01-01", "localName": "Old", "name": "Old", "types": ["Public"], "counties": None}])
    if 'cadataapi.state.gov' in url or 'data.international.gc.ca' in url:
        return route.abort()  # what browsers see: these servers refuse requests from web pages
    if 'en.wikipedia.org' in url and 'geosearch' in url:
        pages = [
            {"pageid": 1, "title": "Lisbon", "description": "Capital city of Portugal", "coordinates": [{"lat": 38.7077, "lon": -9.1366}], "pageviews": {"d1": 90000}},
            {"pageid": 2, "title": "Belém Tower", "description": "fortified tower in Lisbon", "coordinates": [{"lat": 38.6916, "lon": -9.216}], "pageviews": {"d1": 20000}, "thumbnail": {"source": "https://upload.wikimedia.org/x.jpg"}},
            {"pageid": 3, "title": "São Jorge Castle", "description": "Moorish castle in Lisbon", "coordinates": [{"lat": 38.7139, "lon": -9.1335}], "pageviews": {"d1": 15000}},
            {"pageid": 4, "title": "Baixa", "description": "district of Lisbon", "coordinates": [{"lat": 38.71, "lon": -9.137}], "pageviews": {"d1": 30000}},
            {"pageid": 5, "title": "Rossio railway station", "description": "railway station in Lisbon", "coordinates": [{"lat": 38.714, "lon": -9.141}], "pageviews": {"d1": 9000}},
            {"pageid": 6, "title": "Jerónimos Monastery", "description": "monastery in Lisbon", "coordinates": [{"lat": 38.6979, "lon": -9.2068}]},
            {"pageid": 7, "title": "Lisbon Oceanarium", "description": "public aquarium", "coordinates": [{"lat": 38.7635, "lon": -9.0937}], "pageviews": {"d1": 8000}},
            {"pageid": 8, "title": "Santa Justa Lift", "description": "elevator in Lisbon", "coordinates": [{"lat": 38.7121, "lon": -9.1394}], "pageviews": {"d1": 7000}},
            {"pageid": 9, "title": "Obscure Fountain", "description": "fountain", "coordinates": [{"lat": 38.70, "lon": -9.13}], "pageviews": {"d1": 3}},
        ]
        if 'pvipcontinue' in url:
            return j({"query": {"pages": [{"pageid": 6, "title": "Jerónimos Monastery", "pageviews": {"d1": 25000}}]}})
        return j({"continue": {"pvipcontinue": "6", "continue": "||"}, "query": {"pages": pages}})
    if 'wikivoyage.org' in url:
        if 'list=search' in url:
            return j({"query": {"search": [{"title": "Lisbon"}]}})
        if 'titles=Lisbon' in url:
            return j({"query": {"pages": {"1": {"title": "Lisbon", "extract": "Lisbon is the capital.\n== Get in ==\nBy plane.\n== Stay safe ==\nLisbon is one of the safest capitals in Europe. Pickpocketing is common on tram 28 and around Baixa, so keep valuables out of sight.\n=== Scams ===\nIgnore street sellers offering sunglasses or drugs; the drugs are fake.\n== Go next ==\nSintra."}}}})
        if 'titles=Portugal' in url:
            return j({"query": {"pages": {"2": {"title": "Portugal", "extract": "Portugal is a country.\n== Stay safe ==\nPortugal has a low crime rate. Wildfires can occur in rural areas in summer; follow local warnings. Rip currents are strong on Atlantic beaches.\n== Stay healthy ==\nTap water is safe."}}}})
        return j({"query": {"pages": {"-1": {"title": "x", "missing": ""}}}})
    if 'overpass' in url:
        if FAIL_OVERPASS[0]:
            return route.fulfill(status=504, body='Gateway timeout')
        body = (route.request.post_data or '') + url
        if 'restaurant' in body:
            els = [{"type": "node", "id": i, "lat": 38.7077 + i * 0.001, "lon": -9.1366, "tags": {"name": n, "cuisine": c, **({"wikidata": "Q1"} if i == 3 else {})}}
                   for i, (n, c) in enumerate([("Taberna da Rua", "portuguese"), ("Cervejaria Ramiro", "seafood"), ("Time Out Market", "food_court"), ("A Cevicheria", "peruvian"), ("Café A Brasileira", "coffee_shop"), ("Pizzeria X", "pizza"), ("Taberna da Rua", "portuguese")])]
        else:
            els = [{"type": "way", "id": i, "center": {"lat": 38.70 + i * 0.003, "lon": -9.14}, "tags": {"name": n, **t}}
                   for i, (n, t) in enumerate([("Castelo de São Jorge", {"historic": "castle", "wikipedia": "pt:Castelo"}), ("Mosteiro dos Jerónimos", {"tourism": "attraction", "wikipedia": "en:Jerónimos Monastery"}),
                                               ("Torre de Belém", {"tourism": "attraction", "wikidata": "Q1"}), ("Miradouro da Graça", {"tourism": "viewpoint"}), ("Museu Gulbenkian", {"tourism": "museum", "wikidata": "Q2"}), ("Some bench", {"tourism": "attraction"})])]
        return j({"elements": els})
    if 'en.wikipedia.org' in url and 'prop=revisions' in url:
        if 'wiki' in DOWN:
            return route.abort()
        from urllib.parse import parse_qs, urlparse
        titles = parse_qs(urlparse(url).query)['titles'][0].split('|')
        pages = []
        for t in titles:
            text = WIKI_PAGES.get(t)
            pages.append({"title": t, "revisions": [{"slots": {"main": {"content": text}}}]} if text else {"title": t, "missing": True})
        return j({"query": {"pages": pages}})
    if 'mymemory' in url:
        return j({"responseData": {"translatedText": "MT"}})
    if 'tile.openstreetmap.org' in url or 'upload.wikimedia.org' in url:
        return route.fulfill(status=200, content_type='image/png', body=TILE)
    if 'fonts.' in url:
        return route.abort()
    if url.startswith(BASE):
        return route.continue_()
    print('UNMOCKED', url)
    return route.abort()

def main():
    errors, fails = [], []
    def check(cond, msg):
        print(('PASS ' if cond else 'FAIL ') + msg)
        if not cond: fails.append(msg)
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers='block')
        ctx.route('**/*', handler)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        pg.goto(BASE)
        pg.wait_for_selector('.leaflet-tile-pane', state='attached'); pg.wait_for_timeout(500)
        check(pg.locator('#view-map').is_visible(), 'map tab visible by default')
        if SHOTS: pg.screenshot(path=SHOTS / '01-map-empty.png')

        pg.click('#tab-list')
        check(pg.locator('.empty h2').is_visible(), 'list shows empty state')
        if SHOTS: pg.screenshot(path=SHOTS / '02-list-empty.png')

        pg.click('#add-btn')
        pg.fill('#f-name', 'Family summer holiday')
        pg.fill('#f-country', 'Portugal'); pg.fill('#f-place', 'Lisbon')
        pg.click('#f-find')
        pg.wait_for_selector('.match')
        check(pg.locator('.match').count() == 2, 'search shows 2 matches')
        pg.fill('#f-arrival', ARR.isoformat()); pg.fill('#f-departure', DEP.isoformat())
        if SHOTS: pg.screenshot(path=SHOTS / '03-form.png')
        pg.click('#f-submit')
        pg.wait_for_selector('#detail-sheet[open] #d-city')
        check(pg.inner_text('#d-city') == 'Lisbon', 'detail opens for Lisbon')
        check(pg.inner_text('.trip-name-text') == 'Family summer holiday', 'trip name shown on card')
        pg.wait_for_function("() => !document.querySelector('#detail .skeleton')", timeout=10000)
        txt = pg.inner_text('#detail')
        check('Portuguese' in txt, 'language shown')
        check(pg.locator('.wday').count() == 6, 'weather shows 6 forecast days')
        check('Type C' in txt and 'Type F' in txt and 'fit here' in txt, 'plugs C/F + fits Finnish plugs')
        safety_txt = pg.inner_text('[data-topic="safety"] .topic-body')
        check('Lisbon:' in safety_txt and 'tram 28' in safety_txt and 'Portugal:' in safety_txt, 'safety uses Wikivoyage city + country advice')
        check('Scams' not in safety_txt, 'sub-headings stripped from safety text')
        check(not pg.locator('[data-topic="safety"] .level').count(), 'no level shown when official advisories are unreachable')
        safety = ' '.join(pg.locator('[data-topic="safety"] .topic-body > p:not(.source):not(.muted)').all_inner_texts())
        check(len(safety.split()) <= 100, f'safety ≤ 100 words ({len(safety.split())})')
        check(pg.locator('[data-topic="food"] .places li').count() == 5, '5 restaurants (deduped)')
        sights = pg.locator('[data-topic="sights"] .places li a').all_inner_texts()
        check(len(sights) == 5, f'5 sights {sights}')
        check(sights[:2] == ['São Jorge Castle', 'Jerónimos Monastery'], 'sights ranked by page views weighted by distance (incl. continued batch)')
        check(not any(x in sights for x in ['Lisbon', 'Baixa', 'Rossio railway station']), 'city, districts and stations filtered out')
        check(pg.locator('[data-topic="sights"] img.sight-img').count() == 1, 'sight photo shown when available')
        news = pg.locator('[data-topic="news"] .news li a').all_inner_texts()
        check(len(news) == 5, f'5 news items {news}')
        check(not any('Pakistan' in n or 'Indian troops' in n or 'Japan' in n for n in news), 'events not about the destination are filtered out')
        check(news[0].startswith('A wildfire in central Portugal'), 'newest Current events items first')
        check('Wikipedia' in pg.inner_text('[data-topic="news"]') and 'AP' in pg.inner_text('[data-topic="news"]'), 'source and original outlet shown')
        check(sum(len(n.split()) for n in news) <= 150, f'news ≤ 150 words ({sum(len(n.split()) for n in news)})')
        check('Restauração' in txt and 'Public holiday' in txt, 'holiday during trip shown')
        check('Old' not in pg.inner_text('[data-topic="holidays"]'), 'holiday outside trip hidden')
        check(pg.locator('.numbers li').count() == 10 and 'Obrigado' in txt and 'Bom dia' in txt, 'Portuguese numbers + phrases')
        check(not pg.locator('#detail .error').count(), 'no section errors')
        pg.wait_for_selector('.safety-news h4', timeout=20000)
        sn = pg.inner_text('.safety-news')
        check(pg.locator('.safety-news li').count() == 3 and 'tram 28' in sn and 'wildfire' in sn and 'Line of Control' not in sn, f'safety events shown as context, off-topic ones filtered: {sn[:200]}')
        if SHOTS:
            pg.screenshot(path=SHOTS / '04-detail-top.png')
            body = pg.locator('#detail')
            h = body.evaluate('e => e.scrollHeight')
            for i, y in enumerate(range(0, h, 700)):
                body.evaluate(f'e => e.scrollTop = {y}')
                pg.screenshot(path=SHOTS / f'05-detail-{i}.png')

        check(pg.locator('.chip').count() == 0, 'single-language country shows no language switch')
        check('Official language of Portugal' in txt, 'language comes from bundled table')

        # Notes: autosave, persist, 500-word cap
        pg.fill('#d-notes', 'Hotel booking 12345.\nBring sunscreen.')
        pg.wait_for_function("() => document.querySelector('#d-notes-status').textContent === 'Saved'", timeout=5000)
        check('5 / 500 words' in pg.inner_text('#d-notes-count'), 'notes word counter')
        pg.fill('#d-notes', ' '.join(f'w{i}' for i in range(520)))
        check(pg.evaluate("document.querySelector('#d-notes').value.trim().split(/\\s+/).length") == 500, 'notes capped at 500 words')
        check('limit reached' in pg.inner_text('#d-notes-count'), 'limit message shown')
        pg.fill('#d-notes', 'Hotel booking 12345.\nBring sunscreen.')
        pg.click('#detail [data-close]')
        pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")
        check(pg.locator('.ticket').count() == 1, 'list shows the new ticket')
        check(pg.inner_text('.ticket-city') == 'Family summer holiday' and 'Lisbon, Portugal' in pg.inner_text('.ticket-meta'), 'list shows trip name with city below')
        if SHOTS: pg.screenshot(path=SHOTS / '06-list.png')

        pg.click('.ticket')
        pg.wait_for_selector('#detail-sheet[open]')
        check(True, 'ticket opens the card')
        check(pg.input_value('#d-notes') == 'Hotel booking 12345.\nBring sunscreen.', 'notes kept after closing and reopening (saved on close)')
        pg.go_back()
        pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")
        check(True, 'back button closes the card')

        pg.click('#tab-map')
        pg.wait_for_selector('.pin')
        check(pg.locator('.pin').count() == 1, 'map shows one pin')
        check(pg.inner_text('.pin-label') == 'Family summer holiday', 'pin label shows trip name')
        if SHOTS: pg.screenshot(path=SHOTS / '07-map-pin.png')
        pg.locator('.pin').click()
        pg.wait_for_selector('#detail-sheet[open]')
        check(pg.inner_text('#d-city') == 'Lisbon', 'pin opens the card')
        pg.click('#detail [data-close]')
        pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")

        pg.mouse.click(120, 300)
        pg.wait_for_selector('.new-here button')
        if SHOTS: pg.screenshot(path=SHOTS / '08-map-tap.png')
        pg.click('.new-here button')
        pg.wait_for_function("() => document.querySelector('#f-place').value === 'Porto'")
        check(pg.input_value('#f-country') == 'Portugal', 'map tap pre-fills country + city')
        pg.click('#form-sheet [data-close]')

        # Rename from the card, then clear the name
        pg.click('#tab-list'); pg.click('.ticket')
        pg.wait_for_selector('#detail-sheet[open]')
        pg.click('#d-name .name-btn'); pg.fill('#d-name-input', 'Lisbon weekend'); pg.press('#d-name-input', 'Enter')
        check(pg.inner_text('.trip-name-text') == 'Lisbon weekend', 'rename updates the card')
        if SHOTS: pg.locator('#detail').evaluate('e => e.scrollTop = 0'); pg.screenshot(path=SHOTS / '13-renamed.png')
        check(pg.inner_text('.ticket-city') == 'Lisbon weekend', 'rename updates the list')
        check(pg.locator('.pin-label').inner_text() == 'Lisbon weekend', 'rename updates the pin label')
        pg.click('#d-name .name-btn'); pg.fill('#d-name-input', ''); pg.press('#d-name-input', 'Enter')
        check(pg.locator('.name-add').count() == 1 and pg.inner_text('.ticket-city') == 'Lisbon', 'clearing the name falls back to the city')
        pg.click('#d-name .name-btn'); pg.fill('#d-name-input', 'Typo'); pg.press('#d-name-input', 'Escape')
        check(pg.evaluate("document.querySelector('#detail-sheet').open") and pg.locator('.name-add').count() == 1, 'Escape cancels rename without closing the card')
        pg.click('[data-delete]'); pg.click('.confirm [data-v="1"]')
        pg.wait_for_function("() => !document.querySelector('.ticket')")
        check(True, 'delete removes the card')

        # Map search bar -> pick a result -> New trip card -> form pre-filled -> card created
        pg.click('#tab-map')
        pg.fill('#map-q', 'Lisbon'); pg.press('#map-q', 'Enter')
        pg.wait_for_selector('.result')
        check(pg.locator('.result').count() == 2, 'map search lists 2 results')
        if SHOTS: pg.screenshot(path=SHOTS / '11-map-search.png')
        pg.locator('.result').first.click()
        pg.wait_for_selector('.leaflet-popup .new-here button')
        check(pg.locator('.map-results .result').count() == 0, 'results close after picking one')
        if SHOTS: pg.screenshot(path=SHOTS / '12-map-search-pin.png')
        pg.click('.leaflet-popup .new-here button')
        pg.wait_for_selector('#form-sheet[open]')
        check(pg.input_value('#f-place') == 'Lisbon' and pg.input_value('#f-country') == 'Portugal', 'form pre-filled from search')
        check(pg.locator('.match[aria-pressed="true"]').count() == 1, 'searched place already selected')
        pg.fill('#f-arrival', ARR.isoformat()); pg.fill('#f-departure', DEP.isoformat())
        pg.click('#f-submit')
        pg.wait_for_selector('#detail-sheet[open] #d-city')
        check(pg.inner_text('#d-city') == 'Lisbon', 'card created from map search')
        pg.click('#detail [data-close]')
        pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")

        # Far-future trips -> last-year weather; Overpass down; news for other cities; Wikipedia down
        FAIL_OVERPASS[0] = True
        far_a = (today + datetime.timedelta(days=60)).isoformat(); far_d = (today + datetime.timedelta(days=64)).isoformat()
        cards = [dict(id=f'c{i}', city=c, region='', countryName='Portugal', countryCode='PT', lat=38.7 + i * 0.3, lon=-9.1, arrival=far_a, departure=far_d) for i, c in enumerate(['Lisbon', 'Porto', 'Faro'])]
        pg.evaluate(f"() => localStorage.setItem('travel-advisor.cards.v1', JSON.stringify({json.dumps(cards)}))")
        def open_trip(city):
            if pg.evaluate("document.querySelector('#detail-sheet').open"):
                pg.click('#detail [data-close]'); pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")
            pg.click('#tab-list'); pg.locator('.ticket', has_text=city).click(); pg.wait_for_selector('#detail-sheet[open]')
            pg.wait_for_selector('[data-topic="news"] .news li, [data-topic="news"] .error, [data-topic="news"] .muted', timeout=45000)
        pg.reload()
        open_trip('Lisbon')
        check('Same dates last year' in pg.inner_text('[data-topic="weather"]'), 'far trip uses last-year weather')
        pg.wait_for_selector('[data-topic="food"] .places li, [data-topic="food"] .error', timeout=30000)
        food = pg.locator('[data-topic="food"] .places li a').all_inner_texts()
        check(len(food) == 5 and all(f.startswith('Fallback') for f in food), f'restaurants fall back to Nominatim when Overpass fails {food}')

        open_trip('Porto')
        pn = pg.locator('[data-topic="news"] .news li a').all_inner_texts()
        check(len(pn) >= 4 and not any('tram 28' in n for n in pn), f'Porto trip keeps Portugal-wide events but drops Lisbon-only ones {pn}')

        DOWN.add('wiki')
        pg.reload()
        open_trip('Faro')
        check('Couldn’t load this' in pg.inner_text('[data-topic="news"]'), 'clear error when Wikipedia is unreachable')

        # Dark mode screenshot
        if SHOTS:
            pg.emulate_media(color_scheme='dark'); pg.wait_for_timeout(300)
            pg.locator('#detail').evaluate('e => e.scrollTop = 0')
            pg.screenshot(path=SHOTS / '09-dark-detail.png')
            pg.click('#detail [data-close]'); pg.wait_for_timeout(300)
            pg.screenshot(path=SHOTS / '10-dark-list.png')
        b.close()
    errors = [e for e in errors if 'favicon' not in e and 'net::ERR_FAILED' not in e and '504' not in e]
    check(not errors, f'no JS errors {errors}')
    print(f'\n{len(fails)} failed' if fails else '\nALL PASSED')
    sys.exit(1 if fails else 0)

main()
