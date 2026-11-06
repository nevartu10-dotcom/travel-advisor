// Drag to reorder list items by their handle (.drag-handle), with touch, mouse and keyboard.
// onMove(itemId, toIndex) is called once, when an item is dropped in a new place.

const EDGE = 64; // px from the scroll area's edge where dragging scrolls it

function scrollerOf(el) {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return document.scrollingElement;
}

export function makeSortable(ul, onMove) {
  ul.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle || e.button > 0) return;
    const li = handle.closest('li');
    const items = [...ul.children].filter((x) => x.matches('li[data-id]'));
    const from = items.indexOf(li);
    if (from < 0 || items.length < 2) return;
    e.preventDefault();
    document.activeElement?.blur?.(); // save any text being edited first
    handle.setPointerCapture(e.pointerId);

    const scroller = scrollerOf(ul);
    const scroll0 = scroller.scrollTop;
    const rects = items.map((x) => x.getBoundingClientRect());
    const h = rects[from].height;
    const startY = e.clientY;
    let y = e.clientY;
    let to = from;
    let raf = 0;

    li.classList.add('dragging');
    ul.classList.add('sorting');

    const layout = () => {
      const dy = y - startY + (scroller.scrollTop - scroll0);
      li.style.transform = `translateY(${dy}px)`;
      const center = rects[from].top + h / 2 + dy;
      to = items.filter((x, i) => i !== from && rects[i].top + rects[i].height / 2 < center).length;
      items.forEach((x, i) => {
        if (i === from) return;
        const shift = from < to && i > from && i <= to ? -h : to < from && i >= to && i < from ? h : 0;
        x.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    };
    const tick = () => {
      const box = scroller === document.scrollingElement ? { top: 0, bottom: innerHeight } : scroller.getBoundingClientRect();
      const speed = y < box.top + EDGE ? -(box.top + EDGE - y) / 4 : y > box.bottom - EDGE ? (y - (box.bottom - EDGE)) / 4 : 0;
      if (speed) {
        scroller.scrollTop += Math.max(-16, Math.min(16, speed));
        layout();
      }
      raf = requestAnimationFrame(tick);
    };
    const move = (ev) => {
      y = ev.clientY;
      layout();
    };
    const end = () => {
      cancelAnimationFrame(raf);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      items.forEach((x) => (x.style.transform = ''));
      li.classList.remove('dragging');
      ul.classList.remove('sorting');
      if (to !== from) onMove(li.dataset.id, to, true);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    raf = requestAnimationFrame(tick);
  });

  // Keyboard: arrow up/down on a handle moves the item one step.
  ul.addEventListener('keydown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const items = [...ul.children].filter((x) => x.matches('li[data-id]'));
    const li = handle.closest('li');
    const from = items.indexOf(li);
    const to = from + (e.key === 'ArrowUp' ? -1 : 1);
    if (to < 0 || to >= items.length) return;
    onMove(li.dataset.id, to, false);
    ul.querySelector(`li[data-id="${CSS.escape(li.dataset.id)}"] .drag-handle`)?.focus();
  });
}
