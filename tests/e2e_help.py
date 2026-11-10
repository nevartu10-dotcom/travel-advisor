"""Built-in help: "?" on every screen shows speech bubbles next to its functions (mocked network).

Run:  python3 -m http.server 8765  (from repo root, in another shell)
      python3 tests/e2e_help.py [--shots DIR]
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


TRIPS = [{'id': 'a', 'name': 'Lisbon summer', 'city': 'Lisbon', 'region': 'Lisboa', 'countryName': 'Portugal', 'countryCode': 'PT',
          'lat': 38.7, 'lon': -9.13, 'arrival': ARR.isoformat(), 'departure': DEP.isoformat()},
         {'id': 'b', 'name': 'Rome 2024', 'city': 'Rome', 'region': 'Lazio', 'countryName': 'Italy', 'countryCode': 'IT',
          'lat': 41.9, 'lon': 12.5, 'arrival': '2024-05-01', 'departure': '2024-05-06'}]
PROFILE = {'name': 'Tuomas', 'home': {'countryCode': 'FI', 'countryName': 'Finland', 'city': 'Tampere', 'label': 'Tampere', 'lat': 61.5, 'lon': 23.8}}

LAYOUT = """() => {
  const rect = (e) => e.getBoundingClientRect();
  const bubbles = [...document.querySelectorAll('.help-bubble')].map(rect);
  const rings = document.querySelectorAll('.help-ring').length;
  const badges = document.querySelectorAll('.help-badge').length;
  const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  let overlap = 0;
  for (let i = 0; i < bubbles.length; i++) for (let j = i + 1; j < bubbles.length; j++) if (hit(bubbles[i], bubbles[j])) overlap++;
  const inside = bubbles.every((b) => b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight);
  return { bubbles: bubbles.length, rings, badges, overlap, inside };
}"""


def screen_ok(pg, name, min_rings):
    pg.wait_for_selector('.help-layer'); pg.wait_for_timeout(250)
    L = pg.evaluate(LAYOUT)
    check(L['rings'] >= min_rings, f'{name}: {L["rings"]} functions marked')
    check(L['bubbles'] + L['badges'] == L['rings'], f'{name}: every function has a bubble or a badge {L}')
    check(L['bubbles'] >= 1 and L['overlap'] == 0 and L['inside'], f'{name}: bubbles on screen, none overlapping {L}')
    if SHOTS:
        pg.screenshot(path=str(SHOTS / f'help-{name}.png'))
    return L


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, service_workers='block', locale='en-GB')
    ctx.route('**/*', handler)
    ctx.add_init_script("try { sessionStorage.setItem('prepvoy.splash', '1') } catch (e) {}")
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE)
    pg.evaluate(f"() => {{ localStorage.setItem('travel-advisor.cards.v1', JSON.stringify({json.dumps(TRIPS)})); localStorage.setItem('travel-advisor.profile.v1', JSON.stringify({json.dumps(PROFILE)})); }}")
    pg.reload(); pg.click('.welcome-close'); pg.click('#tab-map'); pg.wait_for_timeout(600)

    # Main tabs: "?" top left
    box = pg.locator('.appbar .help-btn').bounding_box()
    check(box['x'] < 20 and box['y'] < 20, f'? button in the top-left corner {box}')
    check(pg.locator('.appbar .help-btn').get_attribute('aria-label') == 'Help', '? button labelled Help')
    pg.click('.appbar .help-btn')
    check(pg.locator('.appbar .help-btn').get_attribute('aria-pressed') == 'true', '? shows as pressed while help is open')
    screen_ok(pg, 'map', 6)
    check('Type a city or address' in ' '.join(pg.locator('.help-bubble').all_inner_texts()), 'map: search bar explained')

    # A badge opens its bubble
    badge = pg.locator('.help-badge').first
    label = badge.get_attribute('aria-label')
    badge.click(); pg.wait_for_timeout(150)
    check(any(label == x for x in pg.locator('.help-bubble.focused').all_inner_texts()), f'tapping a badge opens its bubble ({label[:40]}…)')
    check(pg.evaluate(LAYOUT)['overlap'] == 0, 'still no overlapping bubbles after opening one')

    pg.click('#tab-list')
    check(pg.locator('.help-layer').count() == 0 and pg.locator('.appbar .help-btn').get_attribute('aria-pressed') == 'false', 'changing tab closes help')
    pg.click('.appbar .help-btn'); screen_ok(pg, 'trips', 5)
    pg.click('.help-close')
    check(pg.locator('.help-layer').count() == 0, '"Close help" closes it')

    pg.click('#tab-checklists'); pg.click('.appbar .help-btn'); screen_ok(pg, 'checklists', 6)
    pg.click('.appbar .help-btn')
    check(pg.locator('.help-layer').count() == 0, 'pressing ? again closes help')

    # Trip card: bubbles follow scrolling
    pg.click('#tab-list'); pg.locator('.ticket').first.click(); pg.wait_for_selector('#detail-sheet[open]'); pg.wait_for_timeout(600)
    check(pg.locator('#detail .help-btn').count() == 1, 'trip card has a ? button')
    pg.click('#detail .help-btn'); screen_ok(pg, 'card', 3)
    first = pg.locator('.help-bubble').all_inner_texts()
    pg.evaluate("document.querySelector('#detail-sheet .sheet-inner').scrollTop = 1400"); pg.wait_for_timeout(300)
    after = pg.locator('.help-bubble').all_inner_texts()
    check(after and after != first, 'scrolling the card shows the help for the sections now on screen')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    check(pg.locator('.help-layer').count() == 0 and pg.evaluate("document.getElementById('detail-sheet').open"), 'Escape closes help, the card stays open')
    pg.click('#detail [data-close]'); pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")

    # Pages
    pg.click('#profile-btn'); pg.wait_for_selector('#profile-sheet[open]'); pg.wait_for_timeout(300)
    pg.click('#profile-sheet .help-btn'); screen_ok(pg, 'profile', 5)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.click('#backup-btn'); pg.wait_for_selector('#backup-sheet[open]'); pg.wait_for_timeout(300)
    pg.click('#backup-sheet .help-btn'); screen_ok(pg, 'backup', 2)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.click('#add-btn'); pg.wait_for_selector('#form-sheet[open]'); pg.wait_for_timeout(300)
    pg.click('#form-sheet .help-btn'); screen_ok(pg, 'new-trip', 6)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.click('#tab-checklists'); pg.click('[data-list-edit]'); pg.wait_for_selector('#list-sheet[open]'); pg.wait_for_timeout(300)
    pg.click('#list-sheet .help-btn'); screen_ok(pg, 'editor', 5)
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # Finnish
    pg.evaluate("() => { const p = JSON.parse(localStorage.getItem('travel-advisor.profile.v1')); p.lang = 'fi'; localStorage.setItem('travel-advisor.profile.v1', JSON.stringify(p)); }")
    pg.reload(); pg.click('.welcome-close'); pg.click('#tab-map'); pg.wait_for_timeout(500); pg.click('.appbar .help-btn')
    pg.wait_for_selector('.help-layer')
    texts = ' '.join(pg.locator('.help-bubble').all_inner_texts() + [x.get_attribute('aria-label') for x in pg.locator('.help-badge').all()])
    check('Sulje ohje' in pg.inner_text('.help-close') and 'Kirjoita kaupunki' in texts, 'help in Finnish')

    check(not errors, f'no JS errors {errors}')
    b.close()

print('\nALL PASSED' if not fails else f'\n{len(fails)} FAILED: {fails}')
sys.exit(1 if fails else 0)
