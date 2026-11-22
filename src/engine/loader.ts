import { gsap } from 'gsap';
import { ease, prefersReducedMotion } from './env';

let format = (p: number) => String(Math.round(p)).padStart(3, '0');
export const setLoaderFormat = (fn: (p: number) => string) => { format = fn; };
let exit: ((root: HTMLElement) => gsap.core.Timeline) | null = null;
export const setLoaderExit = (fn: (root: HTMLElement) => gsap.core.Timeline) => { exit = fn; };

const MIN = 0.18;
const MAX = 0.45;
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
  if (prefersReducedMotion()) {
    finish(root);
    return;
  }
  const count = root.querySelector<HTMLElement>('[data-loader-count]');
  const bar = root.querySelector<HTMLElement>('[data-loader-bar]');
  const navElapsed = performance.now() / 1000;
  const slowBoot = navElapsed > 1.05;
  const minWait = slowBoot ? 0.08 : MIN;
  const maxWait = slowBoot ? 0.18 : MAX;
  let assetsReady = false;
  Promise.race([Promise.all(criticalAssets()), wait(maxWait)]).then(() => { assetsReady = true; });
  const start = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const linear = Math.min(100, (elapsed / Math.max(0.05, minWait)) * 100);
      const pct = assetsReady && elapsed >= minWait ? 100 : elapsed >= maxWait ? 100 : Math.min(92, linear);
      if (count) count.textContent = format(pct);
      if (bar) bar.style.transform = `scaleX(${pct / 100})`;
      if (pct >= 100) { gsap.ticker.remove(tick); resolve(); }
    };
    gsap.ticker.add(tick);
  });

  if (exit) {
    const tl = exit(root);
    if (slowBoot) tl.timeScale(1.85);
    await tl;
    return finish(root);
  }
  await gsap.timeline()
    .to(root.querySelectorAll('[data-loader-out]'), { yPercent: -110, duration: 0.35, ease: ease.inOut })
    .to(root, { autoAlpha: 0, duration: 0.4, ease: ease.inOut }, '-=0.15');
  finish(root);
}

function finish(root: HTMLElement) {
  root.hidden = true;
  document.documentElement.classList.add('is-loaded');
}

const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
