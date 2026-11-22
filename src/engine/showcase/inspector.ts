import { gsap } from 'gsap';
import { setGLFront } from '../gl';
import { prefersReducedMotion } from '../env';
import { startScroll, stopScroll } from '../scroll';
import { getShowcasePlateItems, type ShowcasePlateMesh, type ShowcaseRect } from './plate';

export function mountShowcaseInspector(showcaseEl: HTMLElement): () => void {
  const veil = showcaseEl.querySelector<HTMLElement>('[data-showcase-veil]');
  const dialog = showcaseEl.querySelector<HTMLElement>('[data-showcase-inspector]');
  if (!veil || !dialog) return () => {};

  // Portal modal + veil onto body so root z-index (63 / 64 / 65 / 70) is not trapped inside #main (1)
  document.body.appendChild(veil);
  document.body.appendChild(dialog);

  const stage = dialog.querySelector<HTMLElement>('[data-inspector-stage]');
  const fallbackImg = dialog.querySelector<HTMLImageElement>('[data-inspector-img]');
  const swatchEl = dialog.querySelector<HTMLElement>('[data-inspector-swatch]');
  const idxEl = dialog.querySelector<HTMLElement>('[data-inspector-index]');
  const annotEl = dialog.querySelector<HTMLElement>('[data-inspector-annot]');
  const titleEl = dialog.querySelector<HTMLElement>('[data-inspector-title]');
  const specEl = dialog.querySelector<HTMLElement>('[data-inspector-spec]');
  const ctaBtn = dialog.querySelector<HTMLButtonElement>('[data-inspector-cta]');
  const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-inspector-close]');
  const plates = Array.from(showcaseEl.querySelectorAll<HTMLElement>('.showcase-plate'));
  const baseContext = ctaBtn?.dataset.drawerContext || '';

  const abort = new AbortController();
  const { signal } = abort;

  let isOpen = false;
  let isAnimating = false;
  let savedFocus: HTMLElement | null = null;
  let activePlateMesh: ShowcasePlateMesh | null = null;
  let activeTl: gsap.core.Timeline | null = null;

  const measureStage = (): ShowcaseRect => {
    const r = stage!.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };

  const cleanupState = () => {
    activeTl?.kill();
    activeTl = null;
    isAnimating = false;
    setGLFront('none');
    for (const p of getShowcasePlateItems()) {
      p.overrideRect = null;
      p.expand = 0;
      p.dimOpacity = 1;
    }
    plates.forEach((p) => p.classList.remove('is-dimmed'));
    veil.hidden = true;
    veil.style.opacity = '0';
    dialog.hidden = true;
    dialog.style.opacity = '0';
    dialog.classList.remove('has-gl');
    dialog.setAttribute('aria-hidden', 'true');
  };

  const close = () => {
    if (!isOpen || isAnimating) return;
    isAnimating = true;
    activeTl?.kill();

    const finishClose = () => {
      cleanupState();
      isOpen = false;
      startScroll();
      savedFocus?.focus({ preventScroll: true });
      savedFocus = null;
    };

    const reduced = prefersReducedMotion();
    if (!reduced && activePlateMesh) {
      const meshItem = activePlateMesh;
      const startRect = meshItem.overrideRect || measureStage();
      const destRectRaw = meshItem.el.getBoundingClientRect();
      const proxy = { ...startRect, expand: meshItem.expand, dim: 0 };

      activeTl = gsap.timeline({ onComplete: finishClose });
      activeTl
        .to([dialog, veil], { opacity: 0, duration: 0.32, ease: 'power2.out' }, 0)
        .to(
          proxy,
          {
            left: destRectRaw.left,
            top: destRectRaw.top,
            width: destRectRaw.width,
            height: destRectRaw.height,
            expand: 0,
            dim: 1,
            duration: 0.62,
            ease: 'power3.inOut',
            onUpdate: () => {
              meshItem.overrideRect = {
                left: proxy.left,
                top: proxy.top,
                width: proxy.width,
                height: proxy.height,
              };
              meshItem.expand = proxy.expand;
              for (const other of getShowcasePlateItems()) {
                if (other !== meshItem) other.dimOpacity = proxy.dim;
              }
            },
          },
          0
        );
    } else if (!reduced) {
      activeTl = gsap.timeline({ onComplete: finishClose });
      activeTl.to([dialog, veil], { opacity: 0, duration: 0.28, ease: 'power2.out' });
    } else {
      finishClose();
    }
  };

  const openPlate = (plateEl: HTMLElement) => {
    if (isOpen || isAnimating) return;
    isOpen = true;
    isAnimating = true;
    savedFocus = document.activeElement as HTMLElement | null;
    stopScroll();

    const plateId = plateEl.dataset.plateId || '';
    const swatchHex = plateEl.dataset.swatchHex || '#A77C4D';
    const index = plateEl.querySelector('.showcase-plate__idx')?.textContent?.trim() || '';
    const annot = plateEl.querySelector('.showcase-plate__annot')?.textContent?.trim() || '';
    const title = plateEl.querySelector('.showcase-plate__heading')?.textContent?.trim() || '';
    const spec = plateEl.querySelector('.showcase-plate__spec')?.textContent?.trim() || '';
    const img = plateEl.querySelector<HTMLImageElement>('img');

    if (swatchEl) swatchEl.style.backgroundColor = swatchHex;
    if (idxEl) idxEl.textContent = index;
    if (annotEl) annotEl.textContent = annot;
    if (titleEl) titleEl.textContent = title;
    if (specEl) specEl.textContent = spec;
    if (ctaBtn) {
      ctaBtn.dataset.drawerContext = baseContext ? `${baseContext} — ${title}` : title;
    }
    if (fallbackImg && img) {
      fallbackImg.src = img.currentSrc || img.src;
      fallbackImg.alt = img.alt;
    }

    const plateItems = getShowcasePlateItems();
    const glReady = plateEl.querySelector('[data-showcase-gl]')?.classList.contains('is-gl-ready');
    activePlateMesh = (!prefersReducedMotion() && glReady && plateItems.find((p) => p.plateId === plateId)) || null;

    veil.hidden = false;
    dialog.hidden = false;
    dialog.setAttribute('aria-hidden', 'false');
    dialog.classList.toggle('has-gl', Boolean(activePlateMesh));

    const reduced = prefersReducedMotion();
    if (!reduced && activePlateMesh && stage) {
      const meshItem = activePlateMesh;
      const startRectRaw = meshItem.el.getBoundingClientRect();
      const targetRect = measureStage();
      const proxy = {
        left: startRectRaw.left,
        top: startRectRaw.top,
        width: startRectRaw.width,
        height: startRectRaw.height,
        expand: 0,
        dim: 1,
      };

      setGLFront('inspector');
      plates.forEach((p) => {
        if (p !== plateEl) p.classList.add('is-dimmed');
      });

      activeTl = gsap.timeline({
        onComplete: () => {
          isAnimating = false;
          closeBtn?.focus({ preventScroll: true });
        },
      });
      activeTl
        .fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0)
        .fromTo(dialog, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0.15)
        .to(
          proxy,
          {
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            expand: 1,
            dim: 0,
            duration: 0.78,
            ease: 'power4.inOut',
            onUpdate: () => {
              meshItem.overrideRect = {
                left: proxy.left,
                top: proxy.top,
                width: proxy.width,
                height: proxy.height,
              };
              meshItem.expand = proxy.expand;
              for (const other of plateItems) {
                if (other !== meshItem) other.dimOpacity = proxy.dim;
              }
            },
          },
          0
        );
    } else {
      gsap.set([veil, dialog], { opacity: reduced ? 1 : 0 });
      if (!reduced) {
        activeTl = gsap.timeline({
          onComplete: () => {
            isAnimating = false;
            closeBtn?.focus({ preventScroll: true });
          },
        });
        activeTl.to([veil, dialog], { opacity: 1, duration: 0.32, ease: 'power2.out' });
      } else {
        isAnimating = false;
        closeBtn?.focus({ preventScroll: true });
      }
    }
  };

  plates.forEach((plateEl) => {
    plateEl.addEventListener('click', () => openPlate(plateEl), { signal });
    plateEl.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPlate(plateEl);
        }
      },
      { signal }
    );
  });

  closeBtn?.addEventListener('click', close, { signal });
  dialog.addEventListener(
    'click',
    (e) => {
      if (e.target === dialog) close();
    },
    { signal }
  );

  window.addEventListener(
    'resize',
    () => {
      if (!isOpen || !activePlateMesh || !stage) return;
      activePlateMesh.overrideRect = measureStage();
    },
    { passive: true, signal }
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (!isOpen) return;
      const consultDrawer = document.getElementById('consult-drawer');
      if (consultDrawer && !consultDrawer.hidden) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    { signal }
  );

  return () => {
    abort.abort();
    const wasOpen = isOpen;
    cleanupState();
    isOpen = false;
    activePlateMesh = null;
    if (wasOpen) startScroll();
    veil.remove();
    dialog.remove();
  };
}
