"""Trips tab: past trips can be hidden from the map; upcoming trips always show (mocked network).

Run:  python3 -m http.server 8765  (from repo root, in another shell)
      python3 tests/e2e_trips_map.py [--shots DIR]
"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from e2e import handler, BASE, ARR, DEP  # noqa: E402
from playwright.sync_api import sync_playwright

SHOTS = pathlib.Path(sys.argv[sys.argv.index('--shots') + 1]) if '--shots' in sys.argv else None
fails, errors = [], []


def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        fails.append(msg)


def trip(cid, name, city, cc, country, lat, lon, arr, dep):
    return {'id': cid, 'name': name, 'city': city, 'region': city, 'countryName': country, 'countryCode': cc,
            'lat': lat, 'lon': lon, 'arrival': arr, 'departure': dep}


TRIPS = [trip('rome', 'Rome 2024', 'Rome', 'IT', 'Italy', 41.9, 12.5, '2024-05-01', '2024-05-06'),
         trip('oslo', 'Oslo meeting', 'Oslo', 'NO', 'Norway', 59.9, 10.75, '2025-02-10', '2025-02-12'),
         trip('lis', 'Lisbon summer', 'Lisbon', 'PT', 'Portugal', 38.7, -9.1, ARR.isoformat(), DEP.isoformat())]
CARDS = "JSON.parse(localStorage.getItem('travel-advisor.cards.v1'))"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, service_workers='block', locale='en-GB')
    ctx.route('**/*', handler)
    ctx.add_init_script("try { sessionStorage.setItem('prepvoy.splash', '1') } catch (e) {}")
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE)
    pg.evaluate(f"() => localStorage.setItem('travel-advisor.cards.v1', JSON.stringify({json.dumps(TRIPS)}))")
    pg.reload(); pg.click('.welcome-close')

    pins = lambda: sorted(pg.locator('#map .pin-label').all_inner_texts())
    check(pins() == ['Lisbon summer', 'Oslo meeting', 'Rome 2024'], f'all trips on the map by default {pins()}')

    pg.click('#tab-list')
    toggles = pg.locator('[data-map-toggle]')
    check(toggles.count() == 2, 'switch only on the two past trips')
    check(pg.locator('.ticket:not(.past)').locator('xpath=..').locator('[data-map-toggle]').count() == 0, 'upcoming trip has no switch')
    check(all(x.is_checked() for x in toggles.all()), 'past trips are shown by default')
    check('Show on map' in pg.locator('.ticket-map').first.inner_text(), 'switch is labelled')

    pg.locator('.ticket-map', has=pg.locator('[data-map-toggle="rome"]')).click()
    check(not pg.locator('[data-map-toggle="rome"]').is_checked(), 'switch turns off')
    check(pg.evaluate(f"() => {CARDS}.find(c => c.id === 'rome').hideOnMap") is True, 'choice saved on the trip')
    check(pg.is_hidden('#detail-sheet') or not pg.evaluate("() => document.querySelector('#detail-sheet').open"), 'tapping the switch does not open the card')
    if SHOTS:
        pg.wait_for_timeout(300); pg.screenshot(path=str(SHOTS / 'trips-map-toggle.png'))
    pg.click('#tab-map')
    check(pins() == ['Lisbon summer', 'Oslo meeting'], f'hidden past trip is not on the map {pins()}')

    pg.reload(); pg.click('.welcome-close')
    check(pins() == ['Lisbon summer', 'Oslo meeting'], 'still hidden after reload')

    # Upcoming trips ignore the flag
    pg.evaluate(f"() => {{ const c = {CARDS}; c.find(x => x.id === 'lis').hideOnMap = true; localStorage.setItem('travel-advisor.cards.v1', JSON.stringify(c)); }}")
    pg.reload(); pg.click('.welcome-close')
    check('Lisbon summer' in pins(), 'upcoming trip always shown on the map')

    # "Show on map" in a hidden trip's card brings it back
    pg.click('#tab-list'); pg.locator('.ticket', has_text='Rome 2024').click(); pg.wait_for_selector('#detail-sheet[open]')
    pg.locator('#detail button', has_text='Show on map').click()
    pg.wait_for_function("() => document.querySelector('#toast').textContent.includes('Rome 2024')")
    check('shown on the map again' in pg.inner_text('#toast'), 'card button shows the trip again, with a note')
    check('Rome 2024' in pins(), 'trip back on the map')
    pg.click('#tab-list')
    check(pg.locator('[data-map-toggle="rome"]').is_checked(), 'switch is on again')

    # Finnish label
    pg.evaluate("() => localStorage.setItem('travel-advisor.profile.v1', JSON.stringify({lang: 'fi'}))")
    pg.reload(); pg.click('.welcome-close'); pg.click('#tab-list')
    check('Näytä kartalla' in pg.locator('.ticket-map').first.inner_text(), 'label in Finnish')

    check(not errors, f'no JS errors {errors}')
    b.close()

print('\nALL PASSED' if not fails else f'\n{len(fails)} FAILED: {fails}')
sys.exit(1 if fails else 0)
