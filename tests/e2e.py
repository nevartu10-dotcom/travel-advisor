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
TILE = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN89+7dfwAJbgPePoT6KwAAAABJRU5ErkJggg==')

LISBON = {"lat": "38.7077", "lon": "-9.1366", "name": "Lisbon", "display_name": "Lisbon, Lisboa, Portugal",
          "address": {"city": "Lisbon", "state": "Lisboa", "country": "Portugal", "country_code": "pt"}}

def days(start, n):
    return [(start + datetime.timedelta(days=i)).isoformat() for i in range(n)]

def handler(route):
    url = route.request.url
    j = lambda obj: route.fulfill(status=200, content_type='application/json', body=json.dumps(obj), headers={'Access-Control-Allow-Origin': '*'})
    if 'nominatim' in url and '/search' in url:
        return j([LISBON, {**LISBON, "lat": "38.72", "display_name": "Lisbon district, Portugal", "address": {**LISBON["address"], "city": "Lisbon District"}}])
    if 'nominatim' in url and '/reverse' in url:
        return j({**LISBON, "address": {"town": "Porto", "state": "Porto", "country": "Portugal", "country_code": "pt"}})
    if 'restcountries' in url:
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
    if 'cadataapi.state.gov' in url:
        return j([{"Title": "Portugal - Level 1: Exercise Normal Precautions", "Link": "https://travel.state.gov/portugal",
                   "Summary": "<p>Exercise normal precautions in Portugal.</p><p>Petty crime such as pickpocketing is common in tourist areas of Lisbon, especially on trams.</p><p>Wildfires can occur in summer in rural areas.</p>"},
                  {"Title": "Peru - Level 2: Exercise Increased Caution", "Summary": "x"}])
    if 'data.international.gc.ca' in url:
        return j({"data": {"PT": {"advisory-state": 0, "eng": {"advisory-text": "Take normal security precautions", "url-slug": "portugal"}}}})
    if 'overpass' in url:
        body = route.request.post_data or ''
        if 'restaurant' in body:
            els = [{"type": "node", "id": i, "lat": 38.7077 + i * 0.001, "lon": -9.1366, "tags": {"name": n, "cuisine": c, **({"wikidata": "Q1"} if i == 3 else {})}}
                   for i, (n, c) in enumerate([("Taberna da Rua", "portuguese"), ("Cervejaria Ramiro", "seafood"), ("Time Out Market", "food_court"), ("A Cevicheria", "peruvian"), ("Café A Brasileira", "coffee_shop"), ("Pizzeria X", "pizza"), ("Taberna da Rua", "portuguese")])]
        else:
            els = [{"type": "way", "id": i, "center": {"lat": 38.70 + i * 0.003, "lon": -9.14}, "tags": {"name": n, **t}}
                   for i, (n, t) in enumerate([("Castelo de São Jorge", {"historic": "castle", "wikipedia": "pt:Castelo"}), ("Mosteiro dos Jerónimos", {"tourism": "attraction", "wikipedia": "en:Jerónimos Monastery"}),
                                               ("Torre de Belém", {"tourism": "attraction", "wikidata": "Q1"}), ("Miradouro da Graça", {"tourism": "viewpoint"}), ("Museu Gulbenkian", {"tourism": "museum", "wikidata": "Q2"}), ("Some bench", {"tourism": "attraction"})])]
        return j({"elements": els})
    if 'gdeltproject' in url:
        return j({"articles": [{"title": t, "url": f"https://news.example/{i}", "domain": "news.example", "seendate": "20261023T100000Z"} for i, t in enumerate([
            "Portugal unveils new high-speed rail timetable between Lisbon and Porto - Reuters",
            "Portugal unveils new high-speed rail timetable between Lisbon and Porto - Reuters",
            "Lisbon tram strike called off after last-minute agreement with unions",
            "Short",
            "Portugal's tourism numbers reach record high for October as visitors keep coming despite rising prices across the country and housing debates intensifying in the capital region every week",
            "Wildfire season ends early in central Portugal thanks to heavy rains",
            "Portuguese parliament debates housing bill aimed at short-term rentals",
            "Extra article that should not appear"])]})
    if 'mymemory' in url:
        return j({"responseData": {"translatedText": "MT"}})
    if 'tile.openstreetmap.org' in url:
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
        pg.fill('#f-country', 'Portugal'); pg.fill('#f-place', 'Lisbon')
        pg.click('#f-find')
        pg.wait_for_selector('.match')
        check(pg.locator('.match').count() == 2, 'search shows 2 matches')
        pg.fill('#f-arrival', ARR.isoformat()); pg.fill('#f-departure', DEP.isoformat())
        if SHOTS: pg.screenshot(path=SHOTS / '03-form.png')
        pg.click('#f-submit')
        pg.wait_for_selector('#detail-sheet[open] #d-city')
        check(pg.inner_text('#d-city') == 'Lisbon', 'detail opens for Lisbon')
        pg.wait_for_function("() => !document.querySelector('#detail .skeleton')", timeout=10000)
        txt = pg.inner_text('#detail')
        check('Portuguese' in txt, 'language shown')
        check(pg.locator('.wday').count() == 6, 'weather shows 6 forecast days')
        check('Type C' in txt and 'Type F' in txt and 'fit here' in txt, 'plugs C/F + fits Finnish plugs')
        check('Level 1 of 4' in txt and 'About Lisbon' in txt, 'safety level + Lisbon-specific sentence')
        safety = pg.inner_text('[data-topic="safety"] .topic-body').split('Sources:')[0]
        check(len(safety.split()) <= 100, f'safety ≤ 100 words ({len(safety.split())})')
        check(pg.locator('[data-topic="food"] .places li').count() == 5, '5 restaurants (deduped)')
        check(pg.locator('[data-topic="sights"] .places li').count() == 5, '5 sights')
        news = pg.locator('.news li a').all_inner_texts()
        check(len(news) == 5, '5 news headlines (deduped, short ones skipped)')
        check(sum(len(n.split()) for n in news) <= 150, f'news ≤ 150 words ({sum(len(n.split()) for n in news)})')
        check('Restauração' in txt and 'Public holiday' in txt, 'holiday during trip shown')
        check('Old' not in pg.inner_text('[data-topic="holidays"]'), 'holiday outside trip hidden')
        check(pg.locator('.numbers li').count() == 10 and 'Obrigado' in txt and 'Bom dia' in txt, 'Portuguese numbers + phrases')
        check(not pg.locator('#detail .error').count(), 'no section errors')
        if SHOTS:
            pg.screenshot(path=SHOTS / '04-detail-top.png')
            body = pg.locator('#detail')
            h = body.evaluate('e => e.scrollHeight')
            for i, y in enumerate(range(0, h, 700)):
                body.evaluate(f'e => e.scrollTop = {y}')
                pg.screenshot(path=SHOTS / f'05-detail-{i}.png')

        # English chip -> curated English
        pg.click('.chip[data-code="eng"]')
        pg.wait_for_function("() => document.querySelector('.phrases td').innerText.includes('Hello')")
        check(True, 'switching phrase language works')

        pg.click('#detail [data-close]')
        pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")
        check(pg.locator('.ticket').count() == 1, 'list shows the new ticket')
        if SHOTS: pg.screenshot(path=SHOTS / '06-list.png')

        pg.click('.ticket')
        pg.wait_for_selector('#detail-sheet[open]')
        check(True, 'ticket opens the card')
        pg.go_back()
        pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")
        check(True, 'back button closes the card')

        pg.click('#tab-map')
        pg.wait_for_selector('.pin')
        check(pg.locator('.pin').count() == 1, 'map shows one pin')
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

        pg.click('#tab-list'); pg.click('.ticket')
        pg.wait_for_selector('#detail-sheet[open]')
        pg.click('[data-delete]'); pg.click('.confirm [data-v="1"]')
        pg.wait_for_function("() => !document.querySelector('.ticket')")
        check(True, 'delete removes the card')

        # Far-future trip -> last-year weather mode; offline-ish error handling.
        far_a = (today + datetime.timedelta(days=60)).isoformat(); far_d = (today + datetime.timedelta(days=64)).isoformat()
        pg.evaluate(f"""() => localStorage.setItem('travel-advisor.cards.v1', JSON.stringify([{{id:'x',city:'Lisbon',region:'Lisboa',countryName:'Portugal',countryCode:'PT',lat:38.7,lon:-9.1,arrival:'{far_a}',departure:'{far_d}'}}]))""")
        pg.reload(); pg.wait_for_selector('.ticket'); pg.click('.ticket')
        pg.wait_for_selector('.weather-summary')
        check('Same dates last year' in pg.inner_text('[data-topic="weather"]'), 'far trip uses last-year weather')

        # Dark mode screenshot
        if SHOTS:
            pg.emulate_media(color_scheme='dark'); pg.wait_for_timeout(300)
            pg.locator('#detail').evaluate('e => e.scrollTop = 0')
            pg.screenshot(path=SHOTS / '09-dark-detail.png')
            pg.click('#detail [data-close]'); pg.wait_for_timeout(300)
            pg.screenshot(path=SHOTS / '10-dark-list.png')
        b.close()
    errors = [e for e in errors if 'favicon' not in e and 'net::ERR_FAILED' not in e]
    check(not errors, f'no JS errors {errors}')
    print(f'\n{len(fails)} failed' if fails else '\nALL PASSED')
    sys.exit(1 if fails else 0)

main()
