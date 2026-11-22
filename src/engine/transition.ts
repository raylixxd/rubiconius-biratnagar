import { gsap } from 'gsap';
import { ease, prefersReducedMotion } from './env';

export type Transition = {
  leave: (curtain: HTMLElement) => Promise<unknown> | gsap.core.Animation;
  enter: (curtain: HTMLElement) => Promise<unknown> | gsap.core.Animation;
};

let current: Transition = {
  leave: (c) => {
    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);
    return gsap.timeline()
      .set(c, { autoAlpha: 1 })
      .fromTo(blades, { scaleY: 0, transformOrigin: 'bottom center' }, { scaleY: 1, duration: 0.48, stagger: 0.04, ease: ease.inOut });
  },
  enter: (c) => {
    const blades = c.querySelectorAll('.curtain__blades > .curtain__blade');
    gsap.killTweensOf([c, blades]);
    return gsap.timeline()
      .to(blades, { scaleY: 0, transformOrigin: 'top center', duration: 0.5, stagger: 0.04, ease: ease.inOut })
      .set(c, { autoAlpha: 0 });
  },
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
