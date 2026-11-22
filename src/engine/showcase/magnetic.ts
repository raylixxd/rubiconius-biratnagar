import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setPlateHover } from './plate';

gsap.registerPlugin(SplitText, ScrollTrigger);

interface HeadlineTarget {
  el: HTMLElement;
  rect: { left: number; top: number; width: number; height: number };
  xTo: gsap.QuickToFunc;
  yTo: gsap.QuickToFunc;
  plateId: string;
}

export function mountShowcaseMagnetic(showcaseEl: HTMLElement): () => void {
  if (!matchMedia('(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
    return () => {};
  }

  const headlines = Array.from(showcaseEl.querySelectorAll<HTMLElement>('[data-magnetic-headline]'));
  if (!headlines.length) return () => {};

  const abort = new AbortController();
  const { signal } = abort;
  const splits: SplitText[] = [];
  const targets: HeadlineTarget[] = [];

  for (const el of headlines) {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true });
    splits.push(split);

    const card = el.closest<HTMLElement>('.showcase-plate');
    const plateId = card?.dataset.plateId || '';
    const r = el.getBoundingClientRect();

    const target: HeadlineTarget = {
      el,
      rect: { left: r.left, top: r.top, width: r.width || 1, height: r.height || 1 },
      xTo: gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' }),
      yTo: gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' }),
      plateId,
    };
    targets.push(target);

    el.addEventListener('pointerenter', () => {
      const box = el.getBoundingClientRect();
      target.rect = { left: box.left, top: box.top, width: box.width || 1, height: box.height || 1 };
      if (target.plateId) setPlateHover(target.plateId, 1);
    }, { signal });

    el.addEventListener('pointermove', (e) => {
      const nx = ((e.clientX - target.rect.left) / target.rect.width - 0.5) * 2;
      const ny = ((e.clientY - target.rect.top) / target.rect.height - 0.5) * 2;
      target.xTo(Math.max(-12, Math.min(12, nx * 12)));
      target.yTo(Math.max(-6, Math.min(6, ny * 6)));
    }, { passive: true, signal });

    el.addEventListener('pointerleave', () => {
      target.xTo(0);
      target.yTo(0);
      if (target.plateId) setPlateHover(target.plateId, 0);
    }, { signal });
  }

  const measureAll = () => {
    for (const t of targets) {
      const box = t.el.getBoundingClientRect();
      t.rect = { left: box.left, top: box.top, width: box.width || 1, height: box.height || 1 };
    }
  };
  window.addEventListener('resize', measureAll, { passive: true, signal });
  ScrollTrigger.addEventListener('refresh', measureAll);

  return () => {
    abort.abort();
    ScrollTrigger.removeEventListener('refresh', measureAll);
    for (const t of targets) {
      gsap.killTweensOf(t.el);
      gsap.set(t.el, { clearProps: 'x,y' });
    }
    for (const s of splits) {
      try { s.revert(); } catch {}
    }
  };
}
