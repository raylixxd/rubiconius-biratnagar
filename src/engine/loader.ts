import { gsap } from 'gsap';
import { ease, prefersReducedMotion } from './env';

let format = (p: number) => `${Math.round(p)}%`;
export const setLoaderFormat = (fn: (p: number) => string) => { format = fn; };
let exit: ((root: HTMLElement) => gsap.core.Timeline) | null = null;
export const setLoaderExit = (fn: (root: HTMLElement) => gsap.core.Timeline) => { exit = fn; };

const MIN = 0.25;
const MAX = 0.65;
const extraTasks: Promise<unknown>[] = [];

export function registerLoaderTask(p: Promise<unknown>) {
  extraTasks.push(p.catch(() => {}));
}

function criticalAssets(): Promise<unknown>[] {
  const imgs = [...document.querySelectorAll<HTMLImageElement>('img[data-critical], [data-intro] img, [data-gl-instant] img')];
  const tasks = extraTasks.splice(0);
  return [document.fonts.ready, ...tasks, ...imgs.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => {})))];
}

export async function runLoader(): Promise<void> {
  const root = document.getElementById('loader');
  if (!root) return;
  const seen = (() => {
    try { return sessionStorage.getItem('rubiconius_seen') === '1'; } catch { return false; }
  })();
  if (prefersReducedMotion() || seen) {
    finish(root);
    return;
  }
  try { sessionStorage.setItem('rubiconius_seen', '1'); } catch {}
  root.style.pointerEvents = 'none';
  const count = root.querySelector<HTMLElement>('[data-loader-count]');
  const minWait = MIN;
  const maxWait = MAX;
  let assetsReady = false;
  Promise.race([Promise.all(criticalAssets()), wait(maxWait)]).then(() => { assetsReady = true; });
  const start = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const linear = Math.min(100, (elapsed / Math.max(0.05, minWait)) * 100);
      const pct = assetsReady && elapsed >= minWait ? 100 : elapsed >= maxWait ? 100 : Math.min(97, linear);
      if (count) count.textContent = format(pct);
      if (pct >= 100) { gsap.ticker.remove(tick); resolve(); }
    };
    gsap.ticker.add(tick);
  });

  if (count) count.textContent = '100%';

  if (exit) {
    const tl = exit(root);
    await tl;
    return finish(root);
  }

  // Otto Objects Radial Iris Unlock + Hero Stage Settle
  const mark = root.querySelector<HTMLElement>('.loader__mark');
  const outs = root.querySelectorAll<HTMLElement>('[data-loader-out]');
  const heroStage = document.querySelector<HTMLElement>('[data-otto-hero-stage]');
  const maxHole = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight) * 0.72);
  const iris = { r: 0 };

  if (heroStage) gsap.set(heroStage, { scale: 1.07 });
  root.classList.add('is-opening');

  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    if (outs.length) {
      tl.to(outs, { yPercent: -110, duration: 0.45, ease: 'power2.inOut', stagger: 0.04 }, 0);
    }
    if (mark) {
      tl.to(mark, { scale: 0.84, opacity: 0, duration: 0.35, ease: ease.inOut }, 0.05);
    }
    tl.to(
      iris,
      {
        r: maxHole,
        duration: 0.95,
        ease: 'power3.inOut',
        onUpdate: () => root.style.setProperty('--hole', `${Math.round(iris.r)}px`),
      },
      0.12
    );
    if (heroStage) {
      tl.to(heroStage, { scale: 1, duration: 1.55, ease: 'power3.out', clearProps: 'transform' }, 0.12);
    }
  });

  root.classList.remove('is-opening');
  root.style.removeProperty('--hole');
  finish(root);
}

function finish(root: HTMLElement) {
  root.hidden = true;
  document.documentElement.classList.add('is-loaded');
}

const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
