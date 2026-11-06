"""Name, icons and opening animation (mocked network).

Run:  python3 -m http.server 8765  (from repo root, in another shell)
      python3 tests/e2e_splash.py [--video DIR]
"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from e2e import handler, BASE  # noqa: E402
from playwright.sync_api import sync_playwright

VIDEO = pathlib.Path(sys.argv[sys.argv.index('--video') + 1]) if '--video' in sys.argv else None
fails, errors = [], []


def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        fails.append(msg)


with sync_playwright() as p:
    b = p.chromium.launch()
    opts = dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, service_workers='block', locale='en-GB')
    if VIDEO:
        opts.update(record_video_dir=str(VIDEO), record_video_size={'width': 390, 'height': 844})
    ctx = b.new_context(**opts)
    ctx.route('**/*', handler)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE)

    check(pg.title() == 'Prepvoy', 'page title is Prepvoy')
    check(pg.is_visible('#splash') and pg.inner_text('.splash-word') == 'Prepvoy', 'opening animation shows the Prepvoy logo')
    check(pg.is_hidden('#welcome'), 'welcome waits for the animation')
    pg.wait_for_selector('#splash', state='detached', timeout=3500)
    check(True, 'animation removes itself within about 2 seconds')
    pg.wait_for_selector('#welcome:not([hidden])')
    check(True, 'welcome appears after the animation')
    if VIDEO:
        pg.wait_for_timeout(800)
    pg.reload()
    check(pg.locator('#splash').count() == 0, 'not replayed on reload in the same session (e.g. language change)')
    man = pg.evaluate("() => fetch('manifest.webmanifest').then(r => r.json())")
    check(man['name'] == 'Prepvoy' and man['short_name'] == 'Prepvoy', 'install name is Prepvoy')
    check(pg.evaluate("() => fetch('icons/icon.svg').then(r => r.text())").count('stroke="#0abaff"') == 1, 'icon has the check-mark pin')

    # Reduced motion: shorter, no movement
    ctx2 = b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', reduced_motion='reduce')
    ctx2.route('**/*', handler)
    pg2 = ctx2.new_page(); pg2.goto(BASE)
    check(pg2.is_visible('#splash'), 'reduced motion: logo still shown')
    pg2.wait_for_selector('#splash', state='detached', timeout=2000)
    check(True, 'reduced motion: gone within about a second')

    check(not errors, f'no JS errors {errors}')
    ctx.close(); ctx2.close(); b.close()

print('\nALL PASSED' if not fails else f'\n{len(fails)} FAILED: {fails}')
sys.exit(1 if fails else 0)
