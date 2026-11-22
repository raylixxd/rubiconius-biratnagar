import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion, resizeScroll } from '../engine';

gsap.registerPlugin(ScrollTrigger);

/** Exact mathematical cubic-bezier(0.22, 1, 0.36, 1) weighted architectural curve */
function makeCubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-5) break;
      const d = sampleDerivX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sampleY(Math.max(0, Math.min(1, t)));
  };
}

const MONOGRAPH_EASE = makeCubicBezier(0.22, 1, 0.36, 1);

export function initWorksPage(): (() => void) | void {
  const worksRoot = document.querySelector<HTMLElement>('[data-works-root]');
  if (!worksRoot) return;

  const controller = new AbortController();
  const { signal } = controller;
  const reduced = prefersReducedMotion();
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const editorialPanel = worksRoot.querySelector<HTMLElement>('[data-works-panel="editorial"]');
  const indexPanel = worksRoot.querySelector<HTMLElement>('[data-works-panel="index"]');
  const viewButtons = Array.from(
    worksRoot.querySelectorAll<HTMLButtonElement>('[data-works-view-btn]')
  );

  const indexList = worksRoot.querySelector<HTMLElement>('[data-project-index]');
  const follower = worksRoot.querySelector<HTMLElement>('[data-cursor-follow]');
  const rows = Array.from(worksRoot.querySelectorAll<HTMLElement>('[data-index-row]'));
  const slides = Array.from(worksRoot.querySelectorAll<HTMLElement>('[data-follow-slide]'));

  let activeView: 'editorial' | 'index' = 'editorial';
  let toggleTween: gsap.core.Tween | null = null;

  const syncScrollEngines = () => {
    requestAnimationFrame(() => {
      resizeScroll();
      ScrollTrigger.refresh();
    });
  };

  const resetFollower = (immediate = false) => {
    rows.forEach((r) => r.classList.remove('is-dimmed', 'is-hovered'));
    if (!follower) return;
    if (immediate || reduced) {
      gsap.set(follower, { opacity: 0, clipPath: 'inset(8% 0% 8% 0%)' });
    } else {
      gsap.to(follower, {
        opacity: 0,
        clipPath: 'inset(8% 0% 8% 0%)',
        duration: 0.3,
        ease: MONOGRAPH_EASE,
        overwrite: 'auto',
      });
    }
  };

  const ctx = gsap.context(() => {
    // 1. Subtle desktop-only parallax within overflow-hidden editorial frames
    if (!reduced && finePointer && window.innerWidth > 768) {
      const parallaxTargets = worksRoot.querySelectorAll<HTMLElement>('[data-editorial-parallax]');
      const glOn = document.documentElement.classList.contains('gl-on');
      parallaxTargets.forEach((el) => {
        if (glOn && el.closest('[data-gl]')) return;
        const container = el.closest<HTMLElement>('[data-works-spread]') ?? el.parentElement;
        if (!container) return;
        gsap.fromTo(
          el,
          { scale: 1.09, yPercent: -4 },
          {
            scale: 1.09,
            yPercent: 4,
            ease: 'none',
            scrollTrigger: {
              trigger: container,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
            },
          }
        );
      });
    }

    // 2. Fine-pointer floating preview & cursor tracking (strictly gated off on touch devices)
    if (!reduced && finePointer && indexList && follower && rows.length > 0) {
      gsap.set(follower, {
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
        clipPath: 'inset(8% 0% 8% 0%)',
        pointerEvents: 'none',
      });

      const xTo = gsap.quickTo(follower, 'x', { duration: 0.35, ease: MONOGRAPH_EASE });
      const yTo = gsap.quickTo(follower, 'y', { duration: 0.35, ease: MONOGRAPH_EASE });

      indexList.addEventListener(
        'pointermove',
        (e: PointerEvent) => {
          if (activeView !== 'index') return;
          xTo(e.clientX);
          yTo(e.clientY);
        },
        { passive: true, signal }
      );

      rows.forEach((row) => {
        const idx = row.dataset.projectIdx;
        row.addEventListener(
          'pointerenter',
          (e: PointerEvent) => {
            if (activeView !== 'index') return;
            xTo(e.clientX);
            yTo(e.clientY);

            rows.forEach((other) => {
              other.classList.toggle('is-hovered', other === row);
              other.classList.toggle('is-dimmed', other !== row);
            });

            slides.forEach((slide) => {
              const active = slide.dataset.followSlide === idx;
              slide.classList.toggle('is-active', active);
            });

            gsap.to(follower, {
              opacity: 1,
              clipPath: 'inset(0% 0% 0% 0%)',
              duration: 0.35,
              ease: MONOGRAPH_EASE,
              overwrite: 'auto',
            });
          },
          { signal }
        );
      });

      indexList.addEventListener(
        'pointerleave',
        () => {
          resetFollower(false);
        },
        { signal }
      );
    }
  }, worksRoot);

  // 3. View Switcher: Editorial | Index (Zero DOM duplication + Lenis/ScrollTrigger resync)
  const setView = (nextView: 'editorial' | 'index') => {
    if (nextView === activeView || !editorialPanel || !indexPanel) return;

    const fromPanel = activeView === 'editorial' ? editorialPanel : indexPanel;
    const toPanel = nextView === 'editorial' ? editorialPanel : indexPanel;
    activeView = nextView;

    viewButtons.forEach((btn) => {
      const isActive = btn.dataset.worksViewBtn === nextView;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    if (nextView !== 'index') {
      resetFollower(true);
    }

    toggleTween?.kill();

    if (reduced) {
      fromPanel.hidden = true;
      fromPanel.style.opacity = '';
      toPanel.hidden = false;
      toPanel.style.opacity = '1';
      syncScrollEngines();
      return;
    }

    toggleTween = gsap.to(fromPanel, {
      opacity: 0,
      duration: 0.16,
      ease: MONOGRAPH_EASE,
      onComplete: () => {
        fromPanel.hidden = true;
        fromPanel.style.opacity = '';
        toPanel.hidden = false;
        gsap.set(toPanel, { opacity: 0 });
        syncScrollEngines();

        toggleTween = gsap.to(toPanel, {
          opacity: 1,
          duration: 0.35,
          ease: MONOGRAPH_EASE,
          onComplete: () => {
            toPanel.style.opacity = '';
            syncScrollEngines();
          },
        });
      },
    });
  };

  viewButtons.forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const target = btn.dataset.worksViewBtn;
        if (target === 'editorial' || target === 'index') {
          setView(target);
        }
      },
      { signal }
    );
  });

  // 4. Lifecycle-safe teardown across Astro ClientRouter swaps
  let cleaned = false;
  const teardown = () => {
    if (cleaned) return;
    cleaned = true;
    toggleTween?.kill();
    controller.abort();
    ctx.revert();
  };

  document.addEventListener('astro:before-swap', teardown, { once: true, signal });

  return teardown;
}

export function initWorksDetailPage(): (() => void) | void {
  const caseGrid = document.querySelector<HTMLElement>('.case-grid');
  if (!caseGrid) return;

  const controller = new AbortController();
  const { signal } = controller;
  const reduced = prefersReducedMotion();

  const ctx = gsap.context(() => {
    if (reduced) return;

    const factRows = document.querySelectorAll<HTMLElement>('.case-facts div');
    if (factRows.length > 0) {
      gsap.fromTo(
        factRows,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          stagger: 0.05,
          duration: 0.45,
          ease: MONOGRAPH_EASE,
          scrollTrigger: {
            trigger: '.case-facts',
            start: 'top 90%',
            once: true,
          },
        }
      );
    }

    const nextCard = document.querySelector<HTMLElement>('.case-next__card');
    const nextMedia = nextCard?.querySelector<HTMLElement>('.case-next__media');
    if (nextCard && nextMedia) {
      gsap.fromTo(
        nextMedia,
        { clipPath: 'inset(8% 0% 8% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.5,
          ease: MONOGRAPH_EASE,
          scrollTrigger: {
            trigger: nextCard,
            start: 'top 92%',
            once: true,
          },
        }
      );
    }
  }, document);

  let cleaned = false;
  const teardown = () => {
    if (cleaned) return;
    cleaned = true;
    controller.abort();
    ctx.revert();
  };

  document.addEventListener('astro:before-swap', teardown, { once: true, signal });

  return teardown;
}
