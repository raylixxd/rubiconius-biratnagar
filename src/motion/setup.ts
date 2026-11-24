import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ease,
  isTouch,
  onPage,
  onScroll,
  prefersReducedMotion,
  scrollToTarget,
  setLoaderExit,
  setTransition,
  startScroll,
  stopScroll,
  studioAudio,
} from '../engine';
import { site } from '../data/site';
import { createHeroVideoMachine, type HeroVideoSnapshot } from './heroVideoMachine';
import { initReactiveText } from './textMotion';
import { initWorksPage, initWorksDetailPage } from './works';

gsap.registerPlugin(ScrollTrigger);

function initButtonFills() {
  if (isTouch() || prefersReducedMotion()) return;
  const off: (() => void)[] = [];
  document.querySelectorAll<HTMLElement>('[data-fill]').forEach((btn) => {
    const fill = btn.querySelector<HTMLElement>('.btn__fill');
    if (!fill) return;
    const at = (e: PointerEvent) => {
      const r = btn.getBoundingClientRect();
      return `${e.clientX - r.left}px ${e.clientY - r.top}px`;
    };
    let closed = true;
    const open = (pos: string) => {
      if (closed) gsap.set(fill, { clipPath: `circle(0% at ${pos})` });
      closed = false;
      btn.classList.add('is-filled');
      gsap.to(fill, { clipPath: `circle(155% at ${pos})`, duration: 0.5, ease: ease.soft, overwrite: true });
    };
    const close = (pos: string) => {
      btn.classList.remove('is-filled');
      gsap.to(fill, {
        clipPath: `circle(0% at ${pos})`,
        duration: 0.4,
        ease: ease.soft,
        overwrite: true,
        onComplete: () => { closed = true; },
      });
    };
    const pe = (e: PointerEvent) => { open(at(e)); studioAudio.tick(610, 0.02); };
    const pl = (e: PointerEvent) => close(at(e));
    const fc = () => btn.matches(':focus-visible') && open('50% 50%');
    const bl = () => close('50% 50%');
    btn.addEventListener('pointerenter', pe);
    btn.addEventListener('pointerleave', pl);
    btn.addEventListener('focus', fc);
    btn.addEventListener('blur', bl);
    off.push(() => {
      btn.removeEventListener('pointerenter', pe);
      btn.removeEventListener('pointerleave', pl);
      btn.removeEventListener('focus', fc);
      btn.removeEventListener('blur', bl);
    });
  });
  return () => off.forEach((f) => f());
}

function initHeaderControls() {
  let darkZones: Array<{ top: number; bottom: number }> = [];
  let heroThreshold = window.innerHeight * 0.72;
  let prevScrolled: boolean | null = null;
  let prevScrolledHero: boolean | null = null;
  let prevOverDark: boolean | null = null;

  const header = document.querySelector<HTMLElement>('.site-header');
  const heroHeader = document.querySelector<HTMLElement>('.site-header--hero');
  const syncScrolled = (y: number) => {
    const scrolled = y > 24;
    if (scrolled !== prevScrolled) {
      prevScrolled = scrolled;
      header?.setAttribute('data-scrolled', String(scrolled));
    }
    const scrolledHero = y > heroThreshold;
    if (scrolledHero !== prevScrolledHero) {
      prevScrolledHero = scrolledHero;
      heroHeader?.setAttribute('data-scrolled-hero', String(scrolledHero));
    }
  };

  const measureZones = () => {
    const sy = window.scrollY;
    heroThreshold = window.innerHeight * 0.72;
    darkZones = [...document.querySelectorAll<HTMLElement>('.showroom-bridge-wrap, .showroom-inline-track')].map((zone) => {
      const r = zone.getBoundingClientRect();
      return { top: r.top + sy, bottom: r.bottom + sy };
    });
    syncScrolled(sy);
  };
  measureZones();
  addEventListener('resize', measureZones, { passive: true });
  ScrollTrigger.addEventListener('refresh', measureZones);

  const syncHeaderZone = (y: number) => {
    let overDark = false;
    for (const z of darkZones) {
      if (z.top <= y + 72 && z.bottom >= y + 24) {
        overDark = true;
        break;
      }
    }
    if (overDark !== prevOverDark) {
      prevOverDark = overDark;
      document.documentElement.classList.toggle('header-dark', overDark);
    }
  };
  syncHeaderZone(window.scrollY);
  document.documentElement.classList.remove('frame-away');

  const offScroll = onScroll(({ y }) => {
    syncHeaderZone(y);
    syncScrolled(y);
  });

  const soundBtn = document.querySelector<HTMLButtonElement>('[data-sound-toggle]');
  const updateSound = () => {
    if (!soundBtn) return;
    const on = studioAudio.isEnabled();
    soundBtn.setAttribute('aria-pressed', String(on));
    const lbl = soundBtn.querySelector<HTMLElement>('[data-sound-label]');
    if (lbl) lbl.textContent = on ? 'Sound on' : 'Sound';
  };
  const onSoundClick = () => {
    studioAudio.toggle();
    updateSound();
  };
  soundBtn?.addEventListener('click', onSoundClick);
  const offSoundSync = studioAudio.onChange(() => updateSound());
  updateSound();

  const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  const menuClose = document.querySelector<HTMLButtonElement>('[data-menu-close]');
  const menu = document.getElementById('mobile-menu');
  const openMenu = () => {
    if (!menu || !menuBtn) return;
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    stopScroll();
    studioAudio.tick(480, 0.025);
    if (!prefersReducedMotion()) {
      gsap.fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: ease.inOut });
    }
    menu.querySelector<HTMLElement>('a, button')?.focus();
  };
  const closeMenu = () => {
    if (!menu || !menuBtn || menu.hidden) return;
    menuBtn.setAttribute('aria-expanded', 'false');
    const done = () => {
      menu.hidden = true;
      const consultOpen = drawer && !drawer.hidden;
      if (!consultOpen) {
        startScroll();
        menuBtn.focus();
      }
    };
    if (!prefersReducedMotion()) {
      gsap.to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.45, ease: ease.inOut, onComplete: done });
    } else done();
  };
  menuBtn?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  menu?.querySelectorAll('a, button[data-open-drawer]').forEach((el) => el.addEventListener('click', closeMenu));

  const drawer = document.getElementById('consult-drawer');
  const drawerPanel = drawer?.querySelector<HTMLElement>('.drawer__panel');
  const openBtns = document.querySelectorAll<HTMLButtonElement>('[data-open-drawer]');
  const closeBtn = drawer?.querySelector<HTMLButtonElement>('[data-close-drawer]');
  const backdrop = drawer?.querySelector<HTMLElement>('[data-drawer-backdrop]');
  let lastTrigger: HTMLElement | null = null;
  let activeContext = '';

  const form = drawer?.querySelector<HTMLFormElement>('[data-wa-form]');
  const citySelect = form?.querySelector<HTMLSelectElement>('select[name="city"]');
  const onCityManualChange = () => {
    if (citySelect) citySelect.dataset.userEdited = '1';
  };
  citySelect?.addEventListener('change', onCityManualChange);
  const preview = drawer?.querySelector<HTMLElement>('[data-wa-preview]');
  const sendLink = drawer?.querySelector<HTMLAnchorElement>('[data-wa-send]');
  const syncWaMessage = () => {
    if (!form) return;
    const data = new FormData(form);
    const space = String(data.get('space') || 'Turnkey Home Interior');
    const city = String(data.get('city') || 'Biratnagar');
    const area = String(data.get('area') || '2BHK / 3BHK Residence');
    const timeline = String(data.get('timeline') || 'Within 2 months');
    const introLine = activeContext
      ? `Namaste Riya ji, I saw "${activeContext}" on the Rubiconius website`
      : 'Namaste Riya ji, I saw the Rubiconius website';
    const msg = `${introLine} and would like to discuss a ${space} project in ${city} (scope: ${area}, timeline: ${timeline}).`;
    if (preview) preview.textContent = msg;
    if (sendLink) sendLink.href = `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };
  form?.addEventListener('input', syncWaMessage);
  form?.addEventListener('change', syncWaMessage);
  syncWaMessage();

  const openDrawer = (trigger?: HTMLElement) => {
    if (!drawer) return;
    lastTrigger = trigger || (document.activeElement as HTMLElement);
    activeContext = trigger?.dataset.drawerContext?.trim() || '';

    // Auto-populate contextual studio brief when visiting /works/[slug]/ if empty
    if (!activeContext && location.pathname.startsWith('/works/')) {
      const heading = document.querySelector<HTMLElement>('h1')?.textContent?.trim();
      if (heading) {
        activeContext = heading;
      }
    }

    if (location.pathname.startsWith('/works/')) {
      const pageText = document.querySelector<HTMLElement>('.case-hero, .case-meta, main')?.innerText || '';
      if (citySelect && !citySelect.dataset.userEdited) {
        if (/dharan/i.test(pageText) && !/biratnagar/i.test(pageText)) {
          citySelect.value = 'Dharan';
        } else if (/biratnagar/i.test(pageText)) {
          citySelect.value = 'Biratnagar';
        }
      }
    }

    syncWaMessage();
    drawer.hidden = false;
    stopScroll();
    studioAudio.tick(680, 0.03);
    if (drawerPanel && !prefersReducedMotion()) {
      gsap.fromTo(drawerPanel, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: ease.out });
    }
    drawer.querySelector<HTMLElement>('button, input, select')?.focus();
  };
  const closeDrawer = () => {
    if (!drawer || drawer.hidden) return;
    const finishClose = () => {
      drawer.hidden = true;
      startScroll();
      lastTrigger?.focus();
    };
    if (drawerPanel && !prefersReducedMotion()) {
      gsap.to(drawerPanel, { yPercent: 100, duration: 0.4, ease: ease.soft, onComplete: finishClose });
    } else finishClose();
  };
  const openHandlers: Array<() => void> = [];
  openBtns.forEach((b) => {
    const h = () => openDrawer(b);
    b.addEventListener('click', h);
    openHandlers.push(() => b.removeEventListener('click', h));
  });
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (drawer && !drawer.hidden) closeDrawer();
      else if (menu && !menu.hidden) closeMenu();
    }
  };
  document.addEventListener('keydown', onKey);

  const copyBtn = document.querySelector<HTMLButtonElement>('[data-copy-phone]');
  const copyDefaultLabel = copyBtn?.textContent?.trim() || '';
  let copyTimer: number | undefined;
  const onCopyPhone = async () => {
    if (!copyBtn) return;
    const phone = copyBtn.dataset.copyPhone || site.phoneDisplay;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(phone);
        copied = true;
      }
    } catch {}
    if (!copied) {
      const ta = document.createElement('textarea');
      ta.value = phone;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.select();
      try {
        copied = document.execCommand('copy');
      } catch {}
      ta.remove();
    }
    studioAudio.tick(640, 0.025);
    copyBtn.classList.add('is-copied');
    copyBtn.textContent = `Copied \u00b7 ${phone}`;
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyBtn.classList.remove('is-copied');
      copyBtn.textContent = copyDefaultLabel || `Copy Studio Number (${phone})`;
    }, 2200);
  };
  copyBtn?.addEventListener('click', onCopyPhone);

  const backTopBtn = document.querySelector<HTMLButtonElement>('[data-back-to-top]');
  const onBackToTop = () => {
    studioAudio.tick(460, 0.02);
    scrollToTarget(0);
  };
  backTopBtn?.addEventListener('click', onBackToTop);

  // Son Daven Live Biratnagar Studio Clock & Operating Status (Sun to Fri 11:00 to 17:00 NPT)
  const clockEls = Array.from(document.querySelectorAll<HTMLElement>('[data-studio-clock]'));
  const formatStudioClock = () => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kathmandu',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(new Date());

      const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
      const rawHour = parts.find((p) => p.type === 'hour')?.value || '00';
      const hourNum = parseInt(rawHour, 10) % 24;
      const min = parts.find((p) => p.type === 'minute')?.value?.padStart(2, '0') || '00';
      const nptTime = `${String(hourNum).padStart(2, '0')}:${min}`;
      const isOpen = weekday !== 'Sat' && hourNum >= 11 && hourNum < 17;

      clockEls.forEach((el) => {
        el.setAttribute('data-studio-status', isOpen ? 'open' : 'closed');
        el.replaceChildren();
        const dot = document.createElement('span');
        dot.className = 'studio-clock__dot';
        dot.setAttribute('aria-hidden', 'true');
        const timeSpan = document.createElement('span');
        timeSpan.className = 'studio-clock__time';
        timeSpan.textContent = `BIRATNAGAR \u00b7 ${nptTime} NPT`;
        const statusSpan = document.createElement('span');
        statusSpan.className = 'studio-clock__status';
        statusSpan.textContent = isOpen ? 'OPEN' : 'CLOSED';
        el.append(dot, timeSpan, statusSpan);
      });
    } catch {}
  };
  formatStudioClock();
  const clockTimer = window.setInterval(formatStudioClock, 30000);

  // Desktop Tap-to-Copy on tel: links (preserves native tel: dialer on mobile/touch)
  const telAbort = new AbortController();
  const isFinePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const telTimers: number[] = [];
  if (isFinePointer) {
    document.querySelectorAll<HTMLAnchorElement>('a[data-tel-copy]').forEach((link) => {
      const defaultText = link.textContent?.trim() || '';
      link.addEventListener(
        'click',
        async (e) => {
          e.preventDefault();
          const phone = link.dataset.telCopy || site.phoneDisplay;
          let ok = false;
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(phone);
              ok = true;
            }
          } catch {}
          if (!ok) {
            const ta = document.createElement('textarea');
            ta.value = phone;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            ta.style.pointerEvents = 'none';
            document.body.appendChild(ta);
            ta.select();
            try {
              ok = document.execCommand('copy');
            } catch {}
            ta.remove();
          }
          studioAudio.tick(640, 0.025);
          link.classList.add('is-copied');
          link.textContent = `COPIED \u00b7 ${phone}`;
          const t = window.setTimeout(() => {
            link.classList.remove('is-copied');
            link.textContent = defaultText;
          }, 1800);
          telTimers.push(t);
        },
        { signal: telAbort.signal }
      );
    });
  }

  return () => {
    window.clearInterval(clockTimer);
    telTimers.forEach((t) => window.clearTimeout(t));
    telAbort.abort();
    offScroll();
    offSoundSync();
    citySelect?.removeEventListener('change', onCityManualChange);
    removeEventListener('resize', measureZones);
    ScrollTrigger.removeEventListener('refresh', measureZones);
    soundBtn?.removeEventListener('click', onSoundClick);
    menuBtn?.removeEventListener('click', openMenu);
    menuClose?.removeEventListener('click', closeMenu);
    openHandlers.forEach((u) => u());
    closeBtn?.removeEventListener('click', closeDrawer);
    backdrop?.removeEventListener('click', closeDrawer);
    form?.removeEventListener('input', syncWaMessage);
    form?.removeEventListener('change', syncWaMessage);
    document.removeEventListener('keydown', onKey);
    window.clearTimeout(copyTimer);
    copyBtn?.removeEventListener('click', onCopyPhone);
    backTopBtn?.removeEventListener('click', onBackToTop);
  };
}

function initHeroVideo() {
  const video = document.querySelector<HTMLVideoElement>('[data-hero-video]');
  if (!video) return;

  const hero = document.querySelector<HTMLElement>('.cinema-hero');
  const toggleBtn = document.querySelector<HTMLButtonElement>('[data-hero-video-toggle]');
  const reduced = prefersReducedMotion();
  const machine = createHeroVideoMachine({
    reducedMotion: reduced,
    canPlay: !reduced && video.readyState >= 3,
  });

  const abort = new AbortController();
  const { signal } = abort;
  let playSeq = 0;

  const syncButton = (snap: HeroVideoSnapshot) => {
    if (!toggleBtn) return;
    if (snap.state === 'reducedMotion') {
      toggleBtn.hidden = true;
      toggleBtn.setAttribute('aria-pressed', 'true');
      return;
    }
    toggleBtn.hidden = false;
    const isPaused = snap.state === 'pausedByUser' || snap.context.autoplayBlocked;
    toggleBtn.textContent = isPaused ? 'Play film' : 'Pause film';
    toggleBtn.setAttribute('aria-pressed', String(isPaused));
    toggleBtn.setAttribute('aria-label', isPaused ? 'Play background film' : 'Pause background film');
  };

  const applySnapshot = (snap: HeroVideoSnapshot) => {
    syncButton(snap);

    switch (snap.state) {
      case 'reducedMotion': {
        playSeq++;
        video.pause();
        video.classList.remove('is-playing');
        break;
      }
      case 'poster': {
        playSeq++;
        video.pause();
        video.classList.remove('is-playing');
        break;
      }
      case 'pausedByUser': {
        playSeq++;
        video.pause();
        if (!snap.context.canPlay || snap.context.autoplayBlocked) {
          video.classList.remove('is-playing');
        }
        break;
      }
      case 'pausedOffscreen': {
        playSeq++;
        video.pause();
        break;
      }
      case 'playing': {
        const currentSeq = ++playSeq;
        if (!video.paused && video.readyState >= 3) {
          video.classList.add('is-playing');
          break;
        }
        try {
          const p = video.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              if (!signal.aborted && currentSeq === playSeq && machine.matches('playing')) {
                video.classList.add('is-playing');
              }
            }).catch(() => {
              if (!signal.aborted && currentSeq === playSeq) {
                machine.send('PLAY_FAILED');
              }
            });
          } else {
            video.classList.add('is-playing');
          }
        } catch {
          machine.send('PLAY_FAILED');
        }
        break;
      }
    }
  };

  const unsubscribe = machine.subscribe(applySnapshot);
  applySnapshot(machine.getSnapshot());

  if (!reduced) {
    if (video.readyState >= 3) {
      machine.send('CAN_PLAY');
    }

    video.addEventListener('canplay', () => machine.send('CAN_PLAY'), { signal });
    video.addEventListener('canplaythrough', () => machine.send('CAN_PLAY'), { signal });
    video.addEventListener(
      'playing',
      () => {
        if (machine.matches('poster')) {
          machine.send('CAN_PLAY');
        }
        if (machine.matches('playing')) {
          video.classList.add('is-playing');
        }
      },
      { signal }
    );
    video.addEventListener('error', () => machine.send('PLAY_FAILED'), { signal });
  }

  let io: IntersectionObserver | null = null;
  if (!reduced && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        machine.send(entry.isIntersecting ? 'IN_VIEW' : 'OUT_OF_VIEW');
      },
      { threshold: 0.35 }
    );
    io.observe(hero || video);
  }

  toggleBtn?.addEventListener(
    'click',
    () => {
      studioAudio.tick(540, 0.02);
      machine.send('USER_TOGGLE');
    },
    { signal }
  );

  return () => {
    unsubscribe();
    io?.disconnect();
    abort.abort();
    video.pause();
  };
}

function initEditorialTextMotion() {
  const win = window as unknown as Record<string, unknown>;
  win.gsap = gsap;
  win.ScrollTrigger = ScrollTrigger;
  if (prefersReducedMotion()) return;

  const cleanups: Array<() => void> = [];
  const showroomRoots = Array.from(document.querySelectorAll<HTMLElement>('.showroom-root'));
  if (showroomRoots.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-inview', entry.isIntersecting);
        });
      },
      { rootMargin: '150px 0px' }
    );
    showroomRoots.forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

function initStudioLocator() {
  const root = document.querySelector<HTMLElement>('[data-studio-locator]');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-locator-tab]'));
  const iframe = root.querySelector<HTMLIFrameElement>('[data-locator-iframe]');
  const directions = root.querySelector<HTMLAnchorElement>('[data-locator-directions]');
  const addrEl = root.querySelector<HTMLElement>('[data-locator-active-addr]');
  const coordsEl = root.querySelector<HTMLElement>('[data-locator-active-coords]');
  if (!tabs.length || !iframe) return;

  let loadTimer: number | undefined;
  const finishLoad = () => {
    window.clearTimeout(loadTimer);
    iframe.classList.remove('is-loading');
  };
  iframe.addEventListener('load', finishLoad);

  const handlers = tabs.map((tab) => {
    const onClick = () => {
      if (tab.classList.contains('is-active')) return;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      studioAudio.tick(520, 0.02);

      const embedUrl = tab.dataset.embedUrl;
      const mapUrl = tab.dataset.mapUrl;
      const addr = tab.dataset.addr;
      const coords = tab.dataset.coords;
      const city = tab.dataset.city;

      if (addr && addrEl) addrEl.textContent = addr;
      if (coords && coordsEl) coordsEl.textContent = coords;
      if (mapUrl && directions) directions.href = mapUrl;
      if (city) iframe.title = `Rubiconius Studio Map | ${city}`;
      if (embedUrl && iframe.src !== embedUrl) {
        iframe.classList.add('is-loading');
        window.clearTimeout(loadTimer);
        loadTimer = window.setTimeout(finishLoad, 900);
        iframe.src = embedUrl;
      }
    };
    tab.addEventListener('click', onClick);
    return () => tab.removeEventListener('click', onClick);
  });

  return () => {
    window.clearTimeout(loadTimer);
    iframe.removeEventListener('load', finishLoad);
    handlers.forEach((fn) => fn());
  };
}

export function setupMotion() {
  setLoaderExit((root) => {
    const symWrap = root.querySelector('.loader__symbol-wrap');
    const symbol = root.querySelector('.loader__symbol');
    const arch = root.querySelector('.sym__arch');
    const core = root.querySelector('.sym__core');
    const ring = root.querySelector('.sym__ring');
    const ticks = root.querySelector('.sym__ticks');
    const word = root.querySelector('[data-loader-word]');
    const bar = root.querySelector('.loader__bar');

    const tl = gsap.timeline();

    return tl
      .set([arch, core], { fillOpacity: 1, strokeDashoffset: 0, transformOrigin: 'center center' })
      .set([ring, ticks], { svgOrigin: '60 70' })
      .to(bar, { scaleX: 1, duration: 0.1, ease: ease.soft })
      // Beat 1: Architectural split & compass lock
      .to(arch, { y: -6, scale: 1.04, duration: 0.18, ease: ease.out }, '<')
      .to(core, { y: 4, scale: 1.08, duration: 0.18, ease: ease.out }, '<')
      .to(ring, { scale: 0.92, opacity: 1, duration: 0.18, ease: ease.out }, '<')
      .to(ticks, { rotation: 90, opacity: 1, duration: 0.2, ease: ease.inOut }, '<')
      // Beat 2: Precision lockup + wordmark & ring release
      .to([arch, core], { y: 0, scale: 1.1, duration: 0.14, ease: ease.inOut })
      .to([ring, ticks], { scale: 1.25, autoAlpha: 0, duration: 0.18, ease: ease.out }, '<')
      .to(word, { y: -8, letterSpacing: '0.36em', autoAlpha: 0, duration: 0.16, ease: ease.inOut }, '<')
      .to(bar, { autoAlpha: 0, duration: 0.1 }, '<')
      // Beat 3: Subtle compositor fade-out (avoids 14x SVG raster spike)
      .to(symbol || symWrap, { scale: 1.15, autoAlpha: 0, duration: 0.22, ease: ease.out }, '-=0.04')
      .to(root, { autoAlpha: 0, duration: 0.2, ease: ease.out }, '<');
  });

  setTransition({
    leave: (c) => {
      const blades = c.querySelectorAll<HTMLElement>('.curtain__blade');
      const crest = c.querySelector<HTMLElement>('.curtain__crest');
      const line = c.querySelector<HTMLElement>('.curtain__line');
      gsap.killTweensOf([c, blades, crest, line]);
      return gsap.timeline()
        .set(c, { autoAlpha: 1 })
        .set(blades, { transformOrigin: 'bottom center', scaleY: 0 })
        .fromTo(
          blades,
          { scaleY: 0 },
          { scaleY: 1, duration: 0.48, stagger: 0.045, ease: ease.inOut }
        )
        .fromTo(
          crest,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.34, ease: ease.out },
          '-=0.22'
        )
        .fromTo(
          line,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.32, ease: ease.out },
          '<+0.06'
        );
    },
    enter: (c) => {
      const blades = c.querySelectorAll<HTMLElement>('.curtain__blade');
      const crest = c.querySelector<HTMLElement>('.curtain__crest');
      const line = c.querySelector<HTMLElement>('.curtain__line');
      gsap.killTweensOf([c, blades, crest, line]);
      return gsap.timeline()
        .to(line, { scaleX: 0, duration: 0.22, ease: ease.inOut })
        .to(crest, { autoAlpha: 0, y: -12, duration: 0.28, ease: ease.inOut }, '<')
        .set(blades, { transformOrigin: 'top center' })
        .to(
          blades,
          { scaleY: 0, duration: 0.5, stagger: 0.045, ease: ease.inOut },
          '-=0.14'
        )
        .set(blades, { transformOrigin: 'bottom center' })
        .set(c, { autoAlpha: 0 });
    },
  });

  onPage(() => {
    const showroomRoot = document.querySelector<HTMLElement>('[data-showroom-root]');
    if (showroomRoot && showroomRoot.dataset.showroomMode !== 'inline') {
      document.documentElement.classList.remove('header-dark', 'frame-away');
      showroomRoot.classList.add('is-inview');
      let disposed = false;
      let handle: { dispose: () => void } | null = null;
      import('../engine/showroom').then(({ mountShowroom }) => {
        if (disposed) return;
        handle = mountShowroom(showroomRoot, { mode: 'fullscreen' });
      });
      return () => {
        disposed = true;
        showroomRoot.classList.remove('is-inview');
        handle?.dispose();
      };
    }

    const cleanFill = initButtonFills();
    const cleanHeader = initHeaderControls();
    const cleanHeroVideo = initHeroVideo();
    const cleanReactiveText = initReactiveText();
    const cleanEditorial = initEditorialTextMotion();
    const cleanWorks = initWorksPage();
    const cleanWorksDetail = initWorksDetailPage();
    const cleanLocator = initStudioLocator();

    let inlineDisposed = false;
    let inlineHandle: { dispose: () => void } | null = null;
    if (showroomRoot && showroomRoot.dataset.showroomMode === 'inline') {
      import('../engine/showroom').then(({ mountShowroom }) => {
        if (inlineDisposed) return;
        inlineHandle = mountShowroom(showroomRoot, { mode: 'inline' });
      });
    }

    return () => {
      inlineDisposed = true;
      inlineHandle?.dispose();
      cleanLocator?.();
      cleanWorks?.();
      cleanWorksDetail?.();
      cleanFill?.();
      cleanHeader?.();
      cleanHeroVideo?.();
      cleanReactiveText?.();
      cleanEditorial?.();
    };
  });
}
