import { gsap } from 'gsap';
import { isTouch, prefersReducedMotion } from './env';
import { onScroll } from './scroll';

export function initMagnetic(root: ParentNode = document) {
  if (isTouch() || prefersReducedMotion()) return;
  root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic || '0.3');
    const x = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * strength);
      y((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { x(0); y(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
  });
}

let follower: HTMLElement | null = null;
let px = -999, py = -999;

function syncCursorTarget(xPos: number, yPos: number) {
  if (!follower) return;
  const label = follower.querySelector<HTMLElement>('[data-cursor-label]');
  const hit = xPos >= 0 && yPos >= 0 ? document.elementFromPoint(xPos, yPos) : null;
  const target = (hit as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]');
  const text = target?.dataset.cursor || '';
  follower.classList.toggle('is-active', !!text);
  if (label && label.textContent !== text) label.textContent = text;
}

export function initCursor() {
  if (follower || isTouch() || prefersReducedMotion()) return;
  follower = document.getElementById('cursor');
  if (!follower) return;
  const x = gsap.quickTo(follower, 'x', { duration: 0.42, ease: 'power3.out' });
  const y = gsap.quickTo(follower, 'y', { duration: 0.42, ease: 'power3.out' });
  let scrollTimer: number | null = null;
  addEventListener('pointermove', (e) => {
    px = e.clientX;
    py = e.clientY;
    x(px); y(py);
    syncCursorTarget(px, py);
  }, { passive: true });
  // Avoid forced elementFromPoint layout flushes during active scroll; resync once scroll settles
  onScroll(() => {
    follower?.classList.remove('is-active');
    if (scrollTimer !== null) window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => syncCursorTarget(px, py), 180);
  });
  document.addEventListener('pointerleave', () => follower?.classList.remove('is-active'));
  follower.classList.add('is-ready');
}
