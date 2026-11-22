import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollState } from '../scroll';
import { initShowcasePlates, measureShowcasePlates, disposeShowcasePlates } from './plate';

gsap.registerPlugin(ScrollTrigger);

let showcaseCtx: gsap.Context | null = null;
let mm: gsap.MatchMedia | null = null;

const THEMES = {
  charcoal: { bg: [32, 32, 30], fg: [243, 239, 232], border: [243, 239, 232, 0.14] },
  walnut: { bg: [118, 83, 59], fg: [250, 247, 242], border: [250, 247, 242, 0.16] },
  ivory: { bg: [234, 228, 217], fg: [28, 25, 23], border: [28, 25, 23, 0.15] },
} as const;

function lerpRgb(c1: readonly [number, number, number, ...number[]], c2: readonly [number, number, number, ...number[]], t: number): string {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function lerpRgba(
  c1: readonly [number, number, number, number],
  c2: readonly [number, number, number, number],
  t: number
): string {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  const a = (c1[3] + (c2[3] - c1[3]) * t).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function mountShowcase(root: ParentNode = document) {
  unmountShowcase();

  const showcaseEl = root.querySelector<HTMLElement>('#case-showcase');
  if (!showcaseEl) return;

  const viewport = showcaseEl.querySelector<HTMLElement>('[data-showcase-viewport]');
  const track = showcaseEl.querySelector<HTMLElement>('[data-showcase-track]');
  const progressBar = showcaseEl.querySelector<HTMLElement>('[data-showcase-progress]');
  const counterEl = showcaseEl.querySelector<HTMLElement>('[data-showcase-counter]');
  const swatchEl = showcaseEl.querySelector<HTMLElement>('[data-showcase-active-swatch]');
  const plates = showcaseEl.querySelectorAll<HTMLElement>('.showcase-plate');

  if (!viewport || !track || plates.length === 0) return;

  showcaseCtx = gsap.context(() => {
    mm = gsap.matchMedia();

    mm.add('(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      let currentX = 0;
      let currentProgress = 0;
      let lastThemeProgress = -1;
      let anim: gsap.core.Tween;

      const getTotalScroll = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);

      anim = gsap.to(track, {
        x: () => -getTotalScroll(),
        ease: 'none',
        scrollTrigger: {
          trigger: viewport,
          start: 'top top',
          end: () => `+=${getTotalScroll() * 1.2}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            currentX = (gsap.getProperty(track, 'x') as number) || 0;
            currentProgress = self.progress;

            if (progressBar) {
              progressBar.style.transform = `scaleX(${self.progress})`;
            }

            if (Math.abs(self.progress - lastThemeProgress) > 0.004) {
              lastThemeProgress = self.progress;
              const numPlates = plates.length;
              const rawIdx = self.progress * (numPlates - 1);
              const activeIdx = Math.min(Math.floor(rawIdx), numPlates - 1);
              const nextIdx = Math.min(activeIdx + 1, numPlates - 1);
              const factor = rawIdx - activeIdx;

              const currentTheme = (plates[activeIdx]?.dataset.surfaceTheme as keyof typeof THEMES) || 'charcoal';
              const nextTheme = (plates[nextIdx]?.dataset.surfaceTheme as keyof typeof THEMES) || 'charcoal';
              const c1 = THEMES[currentTheme] || THEMES.charcoal;
              const c2 = THEMES[nextTheme] || THEMES.charcoal;

              showcaseEl.style.setProperty('--stage-bg', lerpRgb(c1.bg, c2.bg, factor));
              showcaseEl.style.setProperty('--stage-fg', lerpRgb(c1.fg, c2.fg, factor));
              showcaseEl.style.setProperty('--stage-border', lerpRgba(c1.border, c2.border, factor));

              const roundedIdx = Math.round(rawIdx);
              if (counterEl) {
                const currentNum = String(roundedIdx + 1).padStart(2, '0');
                const totalNum = String(numPlates).padStart(2, '0');
                counterEl.textContent = `${currentNum} / ${totalNum}`;
              }
              if (swatchEl) {
                swatchEl.style.backgroundColor = plates[roundedIdx]?.dataset.swatchHex || '#A77C4D';
              }
            }
          },
        },
      });

      const st = anim.scrollTrigger;
      initShowcasePlates(showcaseEl, viewport, track, () => ({
        start: st ? st.start : 0,
        end: st ? st.end : 1,
        x: currentX,
        progress: currentProgress,
        velocity: scrollState().velocity,
      }));

      const onRefresh = () => {
        currentX = (gsap.getProperty(track, 'x') as number) || 0;
        measureShowcasePlates(viewport, track);
      };
      ScrollTrigger.addEventListener('refresh', onRefresh);

      return () => {
        ScrollTrigger.removeEventListener('refresh', onRefresh);
        anim.kill();
        disposeShowcasePlates();
      };
    });
  }, showcaseEl);
}

export function unmountShowcase() {
  disposeShowcasePlates();
  if (mm) {
    mm.revert();
    mm = null;
  }
  if (showcaseCtx) {
    showcaseCtx.revert();
    showcaseCtx = null;
  }
}
