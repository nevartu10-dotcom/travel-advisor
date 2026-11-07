"""Plug section: older socket types and the multi-adapter tip (mocked network).

Run:  python3 -m http.server 8765  (from repo root, in another shell)
      python3 tests/e2e_plugs.py [--shots DIR]
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


def trip(cid, city, cc, country, lat, lon):
    return {'id': cid, 'city': city, 'region': city, 'countryName': country, 'countryCode': cc, 'lat': lat, 'lon': lon,
            'arrival': ARR.isoformat(), 'departure': DEP.isoformat()}


TRIPS = [trip('br', 'Rio de Janeiro', 'BR', 'Brazil', -22.9, -43.2), trip('pt', 'Lisbon', 'PT', 'Portugal', 38.7, -9.1),
         trip('de', 'Berlin', 'DE', 'Germany', 52.5, 13.4)]
HOME = {'name': 'Tuomas', 'home': {'countryCode': 'FI', 'countryName': 'Finland', 'city': 'Tampere', 'label': 'Tampere', 'lat': 61.5, 'lon': 23.8}}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, service_workers='block', locale='en-GB')
    ctx.route('**/*', handler)
    ctx.add_init_script("try { sessionStorage.setItem('prepvoy.splash', '1') } catch (e) {}")
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE)
    pg.evaluate(f"() => {{ localStorage.setItem('travel-advisor.cards.v1', JSON.stringify({json.dumps(TRIPS)})); localStorage.setItem('travel-advisor.profile.v1', JSON.stringify({json.dumps(HOME)})); }}")
    pg.reload(); pg.click('.welcome-close'); pg.click('#tab-list')

    def plugs(city):
        pg.locator('.ticket', has_text=city).click(); pg.wait_for_selector('#detail-sheet[open]')
        sec = pg.locator('#detail [data-topic="plugs"]')
        sec.locator('.plugs').first.wait_for()
        sec.scroll_into_view_if_needed()
        return sec

    def close():
        pg.click('#detail [data-close]'); pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")

    s = plugs('Rio')
    main = s.locator('.plugs:not(.plugs-older) strong').all_inner_texts()
    older = s.locator('.plugs-older strong').all_inner_texts()
    check(main == ['Type C', 'Type N'] and older == ['Type A', 'Type B'], f'Brazil: C, N in use; A, B in older buildings {main} {older}')
    check('Also found in older buildings' in s.locator('.plug-older-title').inner_text(), 'older types have their own heading')
    check(s.locator('.plug-multi').count() == 1 and '4 plug types are in use here (C, N, A, B)' in s.locator('.plug-multi').inner_text(), 'Brazil: multi-adapter recommended')
    if SHOTS:
        pg.wait_for_timeout(300); s.screenshot(path=str(SHOTS / 'plugs-br.png'))
    close()

    s = plugs('Lisbon')
    check(s.locator('.plugs-older strong').all_inner_texts() == ['Type E'], 'Portugal: E listed as older')
    check(s.locator('.plug-multi').count() == 0, 'Portugal with Finnish plugs (fit every socket): no multi-adapter tip')
    close()

    s = plugs('Berlin')
    check(s.locator('.plugs-older').count() == 0 and s.locator('.plug-multi').count() == 0, 'Germany: no older types, no tip')
    close()

    # Without a home address the tip shows whenever 3+ types are in use
    pg.evaluate("() => localStorage.setItem('travel-advisor.profile.v1', '{}')"); pg.reload(); pg.click('.welcome-close'); pg.click('#tab-list')
    s = plugs('Lisbon')
    check(s.locator('.plug-multi').count() == 1, 'no home set: Portugal (C, F, E) gets the tip')
    close()

    check(not errors, f'no JS errors {errors}')
    b.close()

print('\nALL PASSED' if not fails else f'\n{len(fails)} FAILED: {fails}')
sys.exit(1 if fails else 0)
