/** Navegação 5-way D-pad de aparelhos Android TV e teclados. */
export function installRemoteNavigation(callbacks) {
  function onKeyDown(event) {
    const key = event.key;
    const focused = document.activeElement;
    const isTyping = focused?.tagName === 'TEXTAREA' || focused?.tagName === 'SELECT' || (focused?.tagName === 'INPUT' && !['range','checkbox','radio','button'].includes(focused.type));
    if (focused?.tagName === 'INPUT' && focused.type === 'range' && ['ArrowLeft','ArrowRight'].includes(key)) return;
    if (key === 'Escape' || key === 'Backspace' && !isTyping) {
      event.preventDefault(); callbacks.back?.(); return;
    }
    if (isTyping) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
    const targets = [...document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')]
      .filter(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      });
    if (!targets.length) return;
    const active = document.activeElement;
    if (!targets.includes(active)) { targets[0].focus(); event.preventDefault(); return; }
    const current = active.getBoundingClientRect();
    const cx = current.left + current.width / 2, cy = current.top + current.height / 2;
    const direction = key.replace('Arrow', '');
    const ranked = targets.filter(el => el !== active).map(el => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const main = direction === 'Right' ? x : direction === 'Left' ? -x : direction === 'Down' ? y : -y;
      const cross = direction === 'Right' || direction === 'Left' ? y : x;
      return { el, score: main + Math.abs(cross) * 2.5, valid: main > 4 };
    }).filter(item => item.valid).sort((a, b) => a.score - b.score);
    if (ranked[0]) { event.preventDefault(); ranked[0].el.focus(); ranked[0].el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}
