"""Profile, app languages, welcome message, currency and passport checks (mocked network).

Run:  python3 -m http.server 8765  (from repo root, in another shell)
      python3 tests/e2e_profile.py [--shots DIR]
"""
import sys, json, datetime, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from e2e import handler, BASE, ARR, DEP  # noqa: E402
from playwright.sync_api import sync_playwright

SHOTS = pathlib.Path(sys.argv[sys.argv.index('--shots') + 1]) if '--shots' in sys.argv else None
fails, errors = [], []


def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        fails.append(msg)


def shot(pg, name):
    if SHOTS:
        pg.wait_for_timeout(350)
        pg.screenshot(path=SHOTS / name)


TRIP = {'id': 'lis', 'name': 'Family summer holiday', 'city': 'Lisbon', 'region': 'Lisboa', 'countryName': 'Portugal',
        'countryCode': 'PT', 'lat': 38.7077, 'lon': -9.1366, 'arrival': ARR.isoformat(), 'departure': DEP.isoformat()}


def open_card(pg):
    pg.click('#tab-list')
    pg.click('.ticket')
    pg.wait_for_selector('#detail-sheet[open]')
    pg.wait_for_function("() => !document.querySelector('#detail .skeleton')", timeout=15000)


def close_card(pg):
    pg.click('#detail [data-close]')
    pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")


def save_profile(pg):
    pg.click('#p-save')
    pg.wait_for_function("() => !document.querySelector('#profile-sheet').open", timeout=10000)


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        service_workers='block', locale='en-GB')
    ctx.route('**/*', handler)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.goto(BASE)
    pg.evaluate(f"() => localStorage.setItem('travel-advisor.cards.v1', JSON.stringify([{json.dumps(TRIP)}]))")
    pg.reload()

    # Fresh start: English, generic welcome with a prompt to create a profile
    pg.wait_for_selector('#welcome:not([hidden])')
    check(pg.inner_text('.welcome-hello') == 'Welcome!', 'generic welcome without a profile')
    check(pg.locator('.welcome-setup').count() == 1, 'welcome offers profile setup')
    check(pg.inner_text('#appbar-title') == 'Trip map' and pg.inner_text('#tab-list') == 'List', 'English interface by default')
    shot(pg, 'p01-welcome-new.png')

    # Profile: invalid age, unknown address, then a valid profile
    pg.click('.welcome-setup')
    pg.wait_for_selector('#profile-sheet[open]')
    check(pg.locator('#p-lang option').count() == 8, 'eight app languages offered')
    check('Add your home address' in pg.inner_text('#p-currency'), 'currency asks for an address first')
    pg.fill('#p-name', 'Tuomas Virtanen')
    pg.fill('#p-age', '200')
    pg.click('#p-save')
    check('between 0 and 120' in pg.inner_text('#p-error'), 'invalid age rejected')
    pg.fill('#p-age', '45')
    pg.fill('#p-address', 'Nowhere street 999')
    pg.click('#p-save')
    pg.wait_for_function("() => document.querySelector('#p-error').textContent.includes('Couldn’t find')")
    check(True, 'unknown address rejected with a clear message')
    pg.fill('#p-address', 'Mannerheimintie 1, Helsinki')
    pg.click('#p-find')
    pg.wait_for_function("() => document.querySelector('#p-home').textContent.includes('Helsinki')")
    check('Finland' in pg.inner_text('#p-home'), 'home address resolves to Finland')
    check('Euro (EUR)' in pg.inner_text('#p-currency'), 'currency set automatically to Euro')
    pg.select_option('#p-gender', 'male')
    soon = (DEP + datetime.timedelta(days=60)).isoformat()  # within 6 months of the trip
    pg.fill('#p-passport', soon)
    check('less than 6 months' in pg.inner_text('#p-passport-status'), 'profile shows passport expiring soon')
    shot(pg, 'p02-profile.png')
    save_profile(pg)
    check(pg.inner_text('#profile-avatar') == 'TV', 'profile button shows initials')
    prof = pg.evaluate("() => JSON.parse(localStorage.getItem('travel-advisor.profile.v1'))")
    check(prof.get('currency') == 'EUR' and prof.get('home', {}).get('countryCode') == 'FI' and prof.get('age') == 45, 'profile saved with home country, currency and age')

    # Home marker on the map
    check(pg.locator('.home-pin').count() == 1 and pg.inner_text('.home-label') == 'Home', 'home shown on the map with a house icon')
    pg.click('#tab-map')
    pg.evaluate("() => window.dispatchEvent(new Event('resize'))")
    shot(pg, 'p02b-map-home.png')
    pg.locator('.home-pin').click()
    pg.wait_for_selector('.leaflet-popup .new-here')
    check('Helsinki, Finland' in pg.inner_text('.leaflet-popup'), 'tapping home shows the home address')
    check(not pg.evaluate("document.querySelector('#form-sheet').open"), 'tapping home doesn’t start a new trip')

    # Trip card uses the profile: passport warning, home plugs
    open_card(pg)
    txt = pg.inner_text('#detail')
    check(pg.locator('.topic.passport').count() == 1 and 'less than 6 months after this trip' in txt, 'card warns about passport validity')
    check('Your home plugs (C/F) fit here' in txt, 'plugs compared with home country (Finland)')
    check('um.fi' in txt, 'official advice link for Finnish home')
    close_card(pg)

    # Reload: welcome in the home country's language (Finnish), even with English interface
    pg.reload()
    pg.wait_for_selector('#welcome:not([hidden])')
    check(pg.inner_text('.welcome-hello') == 'Tervetuloa, Tuomas!', 'welcome in home language (Finnish) with first name')
    check('Your next trip: Family summer holiday' in pg.inner_text('.welcome-line'), 'welcome mentions the next trip')
    shot(pg, 'p03-welcome-fi.png')

    # Switch the app to Finnish
    pg.click('#profile-btn'); pg.wait_for_selector('#profile-sheet[open]')
    pg.select_option('#p-lang', 'fi')
    with pg.expect_navigation():
        pg.click('#p-save')
    pg.wait_for_selector('#welcome:not([hidden])')
    check(pg.evaluate('document.documentElement.lang') == 'fi', 'page language set to Finnish')
    check(pg.inner_text('#appbar-title') in ('Matkakartta', 'Matkat') and pg.inner_text('#tab-list') == 'Lista', f'interface in Finnish {pg.inner_text("#appbar-title")!r}')
    check('Seuraava matkasi' in pg.inner_text('.welcome-line'), 'welcome line in Finnish')
    check(pg.inner_text('.home-label') == 'Koti', 'home label in Finnish')
    shot(pg, 'p04-map-fi.png')
    pg.click('.welcome-close')
    pg.click('#tab-list')
    check('Portugali' in pg.inner_text('.ticket-meta'), 'country name shown in Finnish')
    check('päivän päästä' in pg.inner_text('.ticket-when'), 'countdown in Finnish')
    shot(pg, 'p05-list-fi.png')
    open_card(pg)
    txt = pg.inner_text('#detail')
    for word, what in [('Kieli', 'language title'), ('Sää matkan aikana', 'weather title'), ('Pistokkeet', 'plugs title'),
                       ('Turvallisuus', 'safety title'), ('Numerot ja perussanat', 'phrases title'), ('Passi', 'passport title'),
                       ('Portugali', 'language list in Finnish'), ('Ennuste', 'weather lead'), ('Kotimaasi pistokkeet', 'plug verdict'),
                       ('Hyvää huomenta', 'phrase labels'), ('Omat muistiinpanot', 'notes title'), ('Poista matka', 'delete button')]:
        check(word in txt, f'Finnish card: {what}')
    shot(pg, 'p06-card-fi.png')
    pg.locator('#detail').evaluate('e => e.scrollTop = 900')
    shot(pg, 'p07-card-fi-2.png')
    close_card(pg)

    # Every language renders the interface without missing text or errors
    for code, title in [('fr', ('Carte des voyages', 'Voyages')), ('de', ('Reisekarte', 'Reisen')), ('nb', ('Reisekart', 'Reiser')),
                        ('pt', ('Mapa de viagens', 'Viagens')), ('es', ('Mapa de viajes', 'Viajes')), ('sv', ('Resekarta', 'Resor')),
                        ('en', ('Trip map', 'Trips'))]:
        pg.evaluate(f"() => {{ const p = JSON.parse(localStorage.getItem('travel-advisor.profile.v1')); p.lang = '{code}'; localStorage.setItem('travel-advisor.profile.v1', JSON.stringify(p)); localStorage.setItem('travel-advisor.view', 'map'); }}")
        pg.goto(BASE + '#map'); pg.reload()
        pg.wait_for_selector('#welcome:not([hidden])')
        title_seen = pg.inner_text('#appbar-title'); ok = title_seen in title
        open_card(pg)
        body = pg.inner_text('#detail')
        leftovers = [k for k in ['topic.', 'plug.', 'wx.', 'phr.', 'pass.', 'safety.', 'hol.', 'weather.'] if k in body]
        check(ok and not leftovers, f'{code}: interface translated, no raw keys {leftovers} title={title_seen!r}')
        if code == 'de':
            shot(pg, 'p08-card-de.png')
        close_card(pg)

    # Gendered welcome: home in Portugal, gender female → "Bem-vinda"
    pg.click('#profile-btn'); pg.wait_for_selector('#profile-sheet[open]')
    pg.fill('#p-address', 'Rua das Flores, Porto')
    pg.select_option('#p-gender', 'female')
    save_profile(pg)
    pg.reload(); pg.wait_for_selector('#welcome:not([hidden])')
    check(pg.inner_text('.welcome-hello') == 'Bem-vinda, Tuomas!', 'welcome uses gendered Portuguese form')
    pg.click('#profile-btn'); pg.wait_for_selector('#profile-sheet[open]')
    pg.select_option('#p-gender', 'none'); save_profile(pg)
    pg.reload(); pg.wait_for_selector('#welcome:not([hidden])')
    check(pg.inner_text('.welcome-hello') == 'Boas-vindas, Tuomas!', 'neutral form when gender not given')

    # Passport already expired for the trip
    pg.click('#profile-btn'); pg.wait_for_selector('#profile-sheet[open]')
    pg.fill('#p-passport', (ARR + datetime.timedelta(days=2)).isoformat()); save_profile(pg)
    open_card(pg)
    check('before this trip ends' in pg.inner_text('.topic.passport'), 'card warns when passport expires during the trip')
    check('Type C' in pg.inner_text('[data-topic="plugs"]'), 'plugs still shown')
    close_card(pg)

    # Backup carries the profile; restoring brings it back
    pg.click('#backup-btn'); pg.wait_for_selector('#backup-sheet[open]')
    with pg.expect_download() as dl:
        pg.click('#backup-save')
    path = dl.value.path()
    data = json.loads(open(path).read())
    check(data.get('version') == 2 and data.get('profile', {}).get('name') == 'Tuomas Virtanen', 'backup file includes the profile')
    pg.click('#backup-sheet [data-close]')
    pg.evaluate('() => localStorage.clear()'); pg.reload()
    check(pg.inner_text('.welcome-hello') == 'Welcome!', 'after clearing data the profile is gone')
    check(pg.locator('.home-pin').count() == 0, 'no home marker without a profile')
    pg.click('.welcome-close')
    pg.click('#backup-btn'); pg.wait_for_selector('#backup-sheet[open]')
    pg.set_input_files('#backup-file', path)
    pg.wait_for_function("() => document.querySelector('#toast').textContent.includes('profile')")
    check('1 added' in pg.inner_text('#toast'), 'restore reports trip and profile')
    check(pg.inner_text('#profile-avatar') == 'TV', 'restored profile shows initials')
    check(pg.locator('.home-pin').count() == 1, 'restored profile brings the home marker back')

    # Dark mode look of the profile page and welcome
    if SHOTS:
        pg.click('#backup-sheet [data-close]')
        pg.emulate_media(color_scheme='dark')
        pg.reload(); pg.wait_for_selector('#welcome:not([hidden])')
        shot(pg, 'p09-dark-welcome.png')
        pg.click('#profile-btn'); pg.wait_for_selector('#profile-sheet[open]')
        shot(pg, 'p10-dark-profile.png')
    b.close()

errors = [e for e in errors if 'favicon' not in e and 'net::ERR_FAILED' not in e and '504' not in e]
check(not errors, f'no JS errors {errors[:3]}')
print(f'\n{len(fails)} failed' if fails else '\nALL PASSED')
sys.exit(1 if fails else 0)
