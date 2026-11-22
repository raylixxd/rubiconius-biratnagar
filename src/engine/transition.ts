import { gsap } from 'gsap';
import { ease, prefersReducedMotion } from './env';

export type Transition = {
  leave: (curtain: HTMLElement) => Promise<unknown> | gsap.core.Animation;
  enter: (curtain: HTMLElement) => Promise<unknown> | gsap.core.Animation;
};

let current: Transition = {
  leave: (c) => gsap.timeline()
    .set(c, { autoAlpha: 1 })
    .fromTo(c.querySelector('.curtain__panel'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.72, ease: ease.inOut }),
  enter: (c) => gsap.timeline()
    .to(c.querySelector('.curtain__panel'), { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.78, ease: ease.inOut })
    .set(c, { autoAlpha: 0 }),
};

const reduced: Transition = {
  leave: (c) => gsap.timeline().set(c, { autoAlpha: 1 }).fromTo(c, { opacity: 0 }, { opacity: 1, duration: 0.2 }),
  enter: (c) => gsap.to(c, { autoAlpha: 0, duration: 0.2 }),
};

export const setTransition = (t: Transition) => { current = t; };
const pick = () => (prefersReducedMotion() ? reduced : current);
const curtain = () => document.getElementById('curtain') as HTMLElement;

let pendingHold: Promise<unknown> | null = null;

export function holdEnter(p: Promise<unknown>, maxMs = 1500) {
  const cap = new Promise<void>((r) => setTimeout(r, maxMs));
  pendingHold = Promise.race([p.catch(() => {}), cap]);
}

export const playLeave = () => Promise.resolve(pick().leave(curtain()));
export const playEnter = async () => {
  if (pendingHold) {
    const hold = pendingHold;
    pendingHold = null;
    await hold;
  }
  return Promise.resolve(pick().enter(curtain()));
};
