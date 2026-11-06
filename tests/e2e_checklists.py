"""Checklists tab, checklist on a trip card, start-page warning and backup (mocked network).

Run:  python3 -m http.server 8765  (from repo root, in another shell)
      python3 tests/e2e_checklists.py [--shots DIR]
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


today = datetime.date.today()
TRIP = {'id': 'lis', 'name': 'Family summer holiday', 'city': 'Lisbon', 'region': 'Lisboa', 'countryName': 'Portugal',
        'countryCode': 'PT', 'lat': 38.7077, 'lon': -9.1366, 'arrival': ARR.isoformat(), 'departure': DEP.isoformat()}
SOON = {'id': 'osl', 'name': 'Oslo meeting', 'city': 'Oslo', 'region': 'Oslo', 'countryName': 'Norway', 'countryCode': 'NO',
        'lat': 59.91, 'lon': 10.75, 'arrival': (today + datetime.timedelta(days=1)).isoformat(),
        'departure': (today + datetime.timedelta(days=2)).isoformat(), 'type': 'business'}
LS = "JSON.parse(localStorage.getItem('travel-advisor.checklists.v1'))"
CARDS = "JSON.parse(localStorage.getItem('travel-advisor.cards.v1'))"


def lists(pg):
    return pg.evaluate(f'() => {LS}')


def card(pg, cid):
    return next(c for c in pg.evaluate(f'() => {CARDS}') if c['id'] == cid)


def open_trip(pg, title):
    pg.click('#tab-list')
    pg.locator('.ticket', has_text=title).click()
    pg.wait_for_selector('#detail-sheet[open]')


def close_trip(pg):
    pg.click('#detail [data-close]')
    pg.wait_for_function("() => !document.querySelector('#detail-sheet').open")


def close_editor(pg):
    pg.click('#list-done')
    pg.wait_for_function("() => !document.querySelector('#list-sheet').open")
    pg.wait_for_timeout(150)  # the dialog's close event runs just after it closes


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        service_workers='block', locale='en-GB')
    ctx.route('**/*', handler)
    ctx.add_init_script("try { sessionStorage.setItem('prepvoy.splash', '1') } catch (e) {}")  # skip the opening animation
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    # Mocked outages produce network errors on purpose; only real script errors count here.
    pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(m.text))
    pg.goto(BASE)
    pg.evaluate(f"() => localStorage.setItem('travel-advisor.cards.v1', JSON.stringify([{json.dumps(TRIP)}, {json.dumps(SOON)}]))")
    pg.reload(); pg.click('.welcome-close')

    # Third tab, bottom right, with a starter list
    tabs = pg.locator('.tabbar .tab').all_inner_texts()
    check([x.strip() for x in tabs] == ['Map', 'List', 'Checklists'], f'three tabs, checklists last {tabs}')
    pg.click('#tab-checklists')
    check(pg.inner_text('#appbar-title') == 'Checklists' and not pg.is_hidden('#view-checklists'), 'checklists tab opens')
    check(pg.locator('.cl-row').count() == 1 and 'Packing list' in pg.inner_text('.cl-row') and '12 items' in pg.inner_text('.cl-row'),
          'starter packing list is there on first run')
    check(pg.locator('.backup-nudge').count() == 0, 'starter list alone does not ask for a backup')
    shot(pg, 'c01-tab.png')

    # Create and name a new list
    pg.click('#add-list-btn'); pg.wait_for_selector('#list-sheet[open]')
    pg.fill('#le-name', 'Business trip')
    for item in ['Laptop and charger', 'Business cards', 'Presentation']:
        pg.fill('#le-new', item); pg.press('#le-new', 'Enter')
    check(pg.locator('#le-items li').count() == 3, 'items added in the editor')
    pg.locator('#le-items li', has_text='').nth(2).locator('input').fill('Presentation slides')
    pg.locator('#le-items li').nth(2).locator('input').dispatch_event('change')
    pg.locator('#le-items li').nth(1).locator('[data-remove]').click()
    check(pg.locator('#le-items li').count() == 2, 'item removed in the editor')
    shot(pg, 'c02-editor.png')
    close_editor(pg)
    biz = next(l for l in lists(pg) if l['name'] == 'Business trip')
    check([i['text'] for i in biz['items']] == ['Laptop and charger', 'Presentation slides'], f'list saved with name and edits {biz}')
    check(pg.locator('.cl-row').count() == 2, 'new list shown in the tab')

    # An empty new list left unnamed is not kept
    pg.click('#add-list-btn'); pg.wait_for_selector('#list-sheet[open]'); close_editor(pg)
    check(len(lists(pg)) == 2, f'untouched new list discarded {[l["name"] for l in lists(pg)]}')

    # Copy a list from the tab, rename the copy
    pg.locator('.cl-row', has_text='Packing list').locator('[data-list-copy]').click()
    pg.wait_for_timeout(150)
    check(any(l['name'] == 'Packing list (copy)' and len(l['items']) == 12 for l in lists(pg)), f'list copied with all items {[(l["name"], len(l["items"])) for l in lists(pg)]}')
    pg.locator('.cl-row', has_text='Packing list (copy)').locator('[data-list-edit]').click(); pg.wait_for_selector('#list-sheet[open]')
    pg.fill('#le-name', 'Winter holiday'); pg.fill('#le-new', 'Ski gloves'); close_editor(pg)
    win = next(l for l in lists(pg) if l['name'] == 'Winter holiday')
    check(len(win['items']) == 13 and win['items'][-1]['text'] == 'Ski gloves', 'copy renamed; item typed before closing is kept')
    pack = next(l for l in lists(pg) if l['name'] == 'Packing list')
    check(len(pack['items']) == 12, 'original list unchanged by editing the copy')

    # Keyboard reorder in the editor: arrow down on the first item's handle
    pg.locator('.cl-row', has_text='Winter holiday').locator('[data-list-edit]').click(); pg.wait_for_selector('#list-sheet[open]')
    first = pg.locator('#le-items li').first.locator('input').input_value()
    pg.locator('#le-items li').first.locator('.drag-handle').focus(); pg.keyboard.press('ArrowDown')
    win2 = next(l for l in lists(pg) if l['name'] == 'Winter holiday')
    check(win2['items'][1]['text'] == first and pg.evaluate("document.activeElement.closest('li').dataset.id") == win2['items'][1]['id'],
          'arrow key moves an item and keeps focus on it')
    shot(pg, 'c02b-reorder.png')
    close_editor(pg)

    # Trip card: choose a list and tick items; no editing on the card
    open_trip(pg, 'Oslo meeting')
    pg.locator('#d-checklist-sec').scroll_into_view_if_needed()
    check(pg.locator('#d-cl option').count() == 4, 'card offers no checklist plus the three lists')
    pg.select_option('#d-cl', biz['id'])
    check(card(pg, 'osl').get('checklistId') == biz['id'], 'chosen list saved on the trip')
    check(pg.inner_text('#d-cl-progress') == '0 of 2 done', 'progress shown')
    pg.locator('.cl-checks li', has_text='Laptop').locator('input').check()
    check(pg.inner_text('#d-cl-progress') == '1 of 2 done', 'ticking updates progress')
    check(card(pg, 'osl').get('checked') == [biz['items'][0]['id']], 'tick saved on the trip')
    sec = pg.locator('#d-checklist-sec')
    check(sec.locator('.cl-add, [data-remove], .drag-handle').count() == 0, 'card has no add, remove or reorder controls')
    check(pg.evaluate("() => [...document.querySelectorAll('#detail section.topic')].pop().id") == 'd-checklist-sec', 'checklist is the last section of the card')
    close_trip(pg)

    # Editing happens in the Checklists tab: add an item, drag to reorder
    pg.click('#tab-checklists')
    pg.locator('.cl-row', has_text='Business trip').locator('[data-list-edit]').click(); pg.wait_for_selector('#list-sheet[open]')
    pg.fill('#le-new', 'Visa card'); pg.press('#le-new', 'Enter')

    def drag(src, dst, above=True):
        a = src.locator('.drag-handle').bounding_box(); t_ = dst.bounding_box()
        pg.mouse.move(a['x'] + a['width'] / 2, a['y'] + a['height'] / 2); pg.mouse.down()
        ty = t_['y'] + (4 if above else t_['height'] - 4)
        for k in range(1, 11):
            pg.mouse.move(a['x'] + a['width'] / 2, a['y'] + a['height'] / 2 + (ty - a['y'] - a['height'] / 2) * k / 10)
        pg.mouse.up(); pg.wait_for_timeout(100)
    items = pg.locator('#le-items li')
    drag(items.nth(2), items.first)
    order = [i['text'] for i in next(l for l in lists(pg) if l['id'] == biz['id'])['items']]
    check(order == ['Visa card', 'Laptop and charger', 'Presentation slides'], f'drag to reorder in the editor {order}')
    check([x.input_value() for x in pg.locator('#le-items input').all()] == order, 'editor shows the new order')
    drag(items.first, items.last, above=False)
    order = [i['text'] for i in next(l for l in lists(pg) if l['id'] == biz['id'])['items']]
    check(order == ['Laptop and charger', 'Presentation slides', 'Visa card'], f'drag down to the end {order}')
    close_editor(pg)
    biz = next(l for l in lists(pg) if l['id'] == biz['id'])
    open_trip(pg, 'Oslo meeting')
    check([x.strip() for x in pg.locator('.cl-checks li').all_inner_texts()] == order, 'card shows items and order from the tab')
    check(pg.inner_text('#d-cl-progress') == '1 of 3 done' and pg.locator('.cl-checks li', has_text='Laptop').locator('input').is_checked(),
          'ticks kept after editing the list')
    pg.locator('#d-checklist-sec').scroll_into_view_if_needed()
    shot(pg, 'c03-card.png')
    close_trip(pg)

    # Ticks belong to the trip: the same list on another trip starts unticked
    open_trip(pg, 'Family summer holiday')
    pg.select_option('#d-cl', biz['id'])
    check(pg.inner_text('#d-cl-progress') == '0 of 3 done', 'same list on another trip has its own ticks')
    pg.select_option('#d-cl', '')
    check(pg.locator('.cl-checks').count() == 0 and not card(pg, 'lis').get('checklistId'), 'trip can go back to no checklist')
    close_trip(pg)
    check('🧳 1/3' in pg.locator('.ticket', has_text='Oslo').inner_text(), 'list view shows checklist progress')
    check(pg.locator('.cl-row', has_text='Business trip').inner_text().count('used by 1 trip') == 1, 'tab shows how many trips use a list')

    # Start-page warning: trip tomorrow with unfinished list
    pg.reload()
    pg.wait_for_selector('#cl-warn:not([hidden])')
    txt = pg.inner_text('#cl-warn')
    check('Checklist not finished' in txt and 'Oslo meeting starts tomorrow: 2 items left in “Business trip”.' in txt, f'warning on start page {txt!r}')
    check(pg.locator('#cl-warn', has_text='Family summer').count() == 0, 'no warning for a trip further away')
    shot(pg, 'c04-warning.png')
    pg.click('.cl-warn-open'); pg.wait_for_selector('#detail-sheet[open]')
    pg.wait_for_timeout(300)
    check(pg.evaluate("() => { const r = document.getElementById('d-checklist-sec').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }"),
          'warning opens the card at the checklist')
    for li in pg.locator('.cl-checks li input').all():
        li.check()
    check(pg.inner_text('#d-cl-progress') == 'All done – ready to go!', 'all ticked: done message')
    close_trip(pg)
    check(pg.is_hidden('#cl-warn'), 'warning disappears once the list is complete')
    pg.reload()
    check(pg.is_hidden('#cl-warn'), 'no warning after reload when complete')

    # Warning dismiss
    pg.evaluate(f"() => {{ const c = {CARDS}; c.find(x => x.id === 'osl').checked = []; localStorage.setItem('travel-advisor.cards.v1', JSON.stringify(c)); }}")
    pg.reload(); pg.wait_for_selector('#cl-warn:not([hidden])')
    pg.click('.cl-warn-close')
    check(pg.is_hidden('#cl-warn'), 'warning can be dismissed')

    # Backup carries checklists and trip selections
    pg.click('#backup-btn'); pg.wait_for_selector('#backup-sheet[open]')
    with pg.expect_download() as dl:
        pg.click('#backup-save')
    path = dl.value.path()
    data = json.loads(open(path).read())
    check(data.get('version') == 3 and len(data.get('checklists', [])) == 3, 'backup includes the checklists')
    check(next(c for c in data['cards'] if c['id'] == 'osl').get('checklistId') == biz['id'], 'backup keeps the trip’s checklist')
    pg.click('#backup-sheet [data-close]')
    pg.evaluate('() => localStorage.clear()'); pg.reload()
    pg.evaluate("() => localStorage.setItem('travel-advisor.checklists.v1', '[]')"); pg.reload()
    pg.click('.welcome-close')
    pg.click('#tab-checklists')
    check(pg.locator('.cl-row').count() == 0 and pg.locator('#checklists .empty').count() == 1, 'empty state when there are no lists')
    pg.click('#backup-btn'); pg.wait_for_selector('#backup-sheet[open]')
    pg.set_input_files('#backup-file', path)
    pg.wait_for_function("() => document.querySelector('#toast').textContent.includes('checklists')")
    check('3 checklists' in pg.inner_text('#toast'), f'restore reports checklists {pg.inner_text("#toast")!r}')
    pg.click('#backup-sheet [data-close]')
    check(pg.locator('.cl-row').count() == 3, 'checklists restored')
    open_trip(pg, 'Oslo meeting')
    check(pg.input_value('#d-cl') == biz['id'] and pg.inner_text('#d-cl-progress') == '0 of 3 done', 'trip’s checklist restored')
    close_trip(pg)

    # Delete a list that a trip uses
    pg.click('#tab-checklists')
    pg.locator('.cl-row', has_text='Business trip').locator('[data-list-delete]').click()
    check('1 trip uses it' in pg.inner_text('.confirm-box'), 'delete warns that a trip uses the list')
    pg.click('.confirm-box [data-v="1"]')
    check(pg.locator('.cl-row').count() == 2 and not card(pg, 'osl').get('checklistId'), 'list deleted and trip left without one')
    # Delete from inside the editor
    pg.locator('.cl-row', has_text='Winter holiday').locator('[data-list-edit]').click(); pg.wait_for_selector('#list-sheet[open]')
    pg.click('#le-delete'); pg.click('.confirm-box [data-v="1"]')
    pg.wait_for_function("() => !document.querySelector('#list-sheet').open")
    check(pg.locator('.cl-row').count() == 1, 'list deleted from the editor')

    # Finnish interface
    pg.evaluate("() => localStorage.setItem('travel-advisor.profile.v1', JSON.stringify({lang: 'fi'}))")
    pg.reload(); pg.click('.welcome-close'); pg.click('#tab-checklists')
    check(pg.inner_text('#tab-checklists').strip() == 'Tarkistuslistat' and '12 kohtaa' in pg.inner_text('.cl-row'), 'checklists in Finnish')
    shot(pg, 'c05-fi.png')

    check(not errors, f'no JS errors {errors}')
    b.close()

print('\nALL PASSED' if not fails else f'\n{len(fails)} FAILED: {fails}')
sys.exit(1 if fails else 0)
