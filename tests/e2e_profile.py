"""Profile, app languages, welcome message, currency and passport checks (mocked network).

Run:  python3 -m http.server 8765  (from repo root, in another shell)
      python3 tests/e2e_profile.py [--shots DIR]
"""
import sys, json, datetime, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from e2e import handler, BASE, ARR, DEP, DOWN  # noqa: E402
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
    ctx.add_init_script("try { sessionStorage.setItem('prepvoy.splash', '1') } catch (e) {}")  # skip the opening animation
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
    check(pg.inner_text('#appbar-title') == 'Map' and pg.inner_text('#tab-list') == 'Trips', 'English interface by default')
    shot(pg, 'p01-welcome-new.png')

    # Profile: invalid birth date, unknown address, then a valid profile
    pg.click('.welcome-setup')
    pg.wait_for_selector('#profile-sheet[open]')
    check(pg.locator('#p-lang option').count() == 8, 'eight app languages offered')
    check('Add your home address' in pg.inner_text('#p-currency'), 'currency asks for an address first')
    pg.fill('#p-name', 'Tuomas Virtanen')
    TODAY = datetime.date.today()
    pg.fill('#p-birth', (TODAY + datetime.timedelta(days=3)).isoformat())
    pg.click('#p-save')
    check('between 1900 and today' in pg.inner_text('#p-error'), 'future birth date rejected')
    BIRTH = '1980-01-02' if TODAY.strftime('%m-%d') != '01-02' else '1980-01-03'
    AGE = TODAY.year - 1980 - (1 if TODAY.strftime('%m-%d') < BIRTH[5:] else 0)
    pg.fill('#p-birth', BIRTH)
    check(pg.inner_text('#p-age-note') == f'Age: {AGE} years', f'age worked out from the birth date: {pg.inner_text("#p-age-note")!r}')
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
    check(prof.get('currency') == 'EUR' and prof.get('home', {}).get('countryCode') == 'FI' and prof.get('birthDate') == BIRTH and 'age' not in prof, 'profile saved with home country, currency and birth date')

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

    # Trip type, country facts with a home country, profile trip counts
    JP = {'id': 'tyo', 'city': 'Tokyo', 'region': 'Tokyo', 'countryName': 'Japan', 'countryCode': 'JP', 'lat': 35.68, 'lon': 139.69,
          'arrival': (ARR + datetime.timedelta(days=30)).isoformat(), 'departure': (ARR + datetime.timedelta(days=36)).isoformat(), 'type': 'business'}
    OLD = {'id': 'old', 'city': 'Bangkok', 'region': '', 'countryName': 'Thailand', 'countryCode': 'TH', 'lat': 13.75, 'lon': 100.5,
           'arrival': '2025-01-10', 'departure': '2025-01-20', 'type': 'holiday'}
    pg.evaluate(f"""() => {{ const c = JSON.parse(localStorage.getItem('travel-advisor.cards.v1')); c.push({json.dumps(JP)}, {json.dumps(OLD)}); localStorage.setItem('travel-advisor.cards.v1', JSON.stringify(c)); }}""")
    pg.reload(); pg.click('.welcome-close')
    pg.click('#tab-list'); pg.locator('.ticket', has_text='Tokyo').click(); pg.wait_for_selector('#detail-sheet[open]')
    pg.wait_for_function("() => !document.querySelector('#detail [data-topic=facts] .skeleton')", timeout=15000)
    facts = pg.inner_text('[data-topic="facts"]')
    check('1 EUR = 163.5 JPY' in facts and 'European Central Bank' in facts, f'facts: exchange rate from home currency {facts[:200]!r}')
    check('7 hours ahead of home' in facts, 'facts: time difference to home (Tokyo vs Helsinki)')
    check('On the left' in facts and 'opposite side to home' in facts, 'facts: left-hand traffic flagged as different from home')
    check(pg.locator('.trip-type [data-type="business"][aria-pressed="true"]').count() == 1, 'card shows trip type')
    shot(pg, 'p02c-facts-tokyo.png')
    close_card(pg)
    pg.locator('.ticket', has_text='Bangkok').click(); pg.wait_for_selector('#detail-sheet[open]')
    DOWN.add('frankfurter')
    pg.wait_for_function("() => !document.querySelector('#detail [data-topic=facts] .skeleton')", timeout=15000)
    check('1 EUR = 38.1 THB' in pg.inner_text('[data-topic="facts"]'), 'facts: rate falls back to currency-api when ECB source fails')
    DOWN.discard('frankfurter')
    close_card(pg)
    pg.locator('.ticket', has_text='Family summer holiday').click(); pg.wait_for_selector('#detail-sheet[open]')
    check(pg.locator('.trip-type [aria-pressed="true"]').count() == 0, 'old trip without a type shows none selected')
    pg.click('.trip-type [data-type="holiday"]')
    check(pg.locator('.trip-type [data-type="holiday"][aria-pressed="true"]').count() == 1, 'trip type can be set on the card')
    check('Same currency as at home' in pg.inner_text('[data-topic="facts"]'), 'facts: same currency (EUR) noted')
    close_card(pg)
    pg.click('#profile-btn'); pg.wait_for_selector('#profile-sheet[open]')
    rows = pg.locator('.stats-table tbody tr').all_inner_texts()
    check(rows[0].split() [-2:] == ['1', '1'] and rows[1].split()[-2:] == ['0', '1'], f'profile counts holiday/business done/coming {rows}')
    shot(pg, 'p02d-profile-stats.png')
    pg.click('#profile-sheet [data-close]')
    pg.evaluate("""() => { const c = JSON.parse(localStorage.getItem('travel-advisor.cards.v1')).filter(x => x.id === 'lis'); localStorage.setItem('travel-advisor.cards.v1', JSON.stringify(c)); }""")

    # Reload: welcome in the home country's language (Finnish), even with English interface
    pg.reload()
    pg.wait_for_selector('#welcome:not([hidden])')
    check(pg.inner_text('.welcome-hello') == 'Tervetuloa, Tuomas!', 'welcome in home language (Finnish) with first name')
    check('Your next trip: Family summer holiday' in pg.inner_text('.welcome-line'), 'welcome mentions the next trip')
    check(pg.locator('#welcome.birthday').count() == 0, 'no birthday greeting on other days')
    shot(pg, 'p03-welcome-fi.png')

    # Birthday: greeting in the home language, age in the app language
    bday = f'1980-{TODAY:%m-%d}' if TODAY.strftime('%m-%d') != '02-29' else '1980-02-29'
    pg.evaluate(f"() => {{ const p = JSON.parse(localStorage.getItem('travel-advisor.profile.v1')); p.birthDate = '{bday}'; localStorage.setItem('travel-advisor.profile.v1', JSON.stringify(p)); }}")
    pg.reload(); pg.wait_for_selector('#welcome.birthday:not([hidden])')
    check(pg.inner_text('.welcome-hello') == '🎂 Hyvää syntymäpäivää, Tuomas!', f'birthday greeting in Finnish: {pg.inner_text(".welcome-hello")!r}')
    check(f'You turn {TODAY.year - 1980} today' in pg.inner_text('.welcome-bday'), 'birthday line with the new age')
    check('Your next trip' in pg.inner_text('#welcome'), 'birthday greeting still mentions the next trip')
    shot(pg, 'p03b-birthday.png')
    pg.evaluate(f"() => {{ const p = JSON.parse(localStorage.getItem('travel-advisor.profile.v1')); p.birthDate = '{BIRTH}'; localStorage.setItem('travel-advisor.profile.v1', JSON.stringify(p)); }}")

    # Switch the app to Finnish
    pg.click('#profile-btn'); pg.wait_for_selector('#profile-sheet[open]')
    pg.select_option('#p-lang', 'fi')
    with pg.expect_navigation():
        pg.click('#p-save')
    pg.wait_for_selector('#welcome:not([hidden])')
    check(pg.evaluate('document.documentElement.lang') == 'fi', 'page language set to Finnish')
    check(pg.inner_text('#appbar-title') in ('Kartta', 'Matkat') and pg.inner_text('#tab-list') == 'Matkat', f'interface in Finnish {pg.inner_text("#appbar-title")!r}')
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
    for code, title in [('fr', ('Carte', 'Voyages')), ('de', ('Karte', 'Reisen')), ('nb', ('Kart', 'Reiser')),
                        ('pt', ('Mapa', 'Viagens')), ('es', ('Mapa', 'Viajes')), ('sv', ('Karta', 'Resor')),
                        ('en', ('Map', 'Trips'))]:
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
    check(data.get('version') == 3 and data.get('profile', {}).get('name') == 'Tuomas Virtanen', 'backup file includes the profile')
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
