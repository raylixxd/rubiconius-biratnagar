import { boot, cleanup, enter, leave, syncFlags } from './index';
import { cancelFlip, hasPendingFlip } from './gl/flip';
import { scrollToTarget } from './scroll';

let navigating = false;
let flipActiveForNav = false;
let clickInterceptorBound = false;

function bindSameUrlClickInterceptor() {
  if (clickInterceptorBound || typeof document === 'undefined') return;
  clickInterceptorBound = true;

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element)?.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return;

    try {
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname && !url.hash && !url.search) {
        e.preventDefault();
        scrollToTarget(0);
      }
    } catch {}
  });
}

export function start(setup?: () => void) {
  bindSameUrlClickInterceptor();

  document.addEventListener('astro:before-preparation', (e) => {
    navigating = true;
    const navEv = e as Event & { loader?: () => Promise<void>; direction?: string; navigationType?: string };
    const allowFlip = hasPendingFlip() && navEv.navigationType !== 'traverse' && navEv.direction !== 'back';
    if (!allowFlip) cancelFlip();
    flipActiveForNav = allowFlip;

    const load = navEv.loader;
    if (load) {
      navEv.loader = async () => {
        await Promise.all([leave(flipActiveForNav), load()]);
      };
    }
  });

  document.addEventListener('astro:before-swap', (e) => {
    const swapEv = e as Event & { swap?: () => void };
    if (typeof swapEv.swap === 'function') {
      const originalSwap = swapEv.swap;
      swapEv.swap = () => {
        const persisted = Array.from(document.querySelectorAll<HTMLElement>('[data-astro-transition-persist]'));
        const ids = persisted.map((el) => ({ el, id: el.getAttribute('data-astro-transition-persist') }));
        persisted.forEach((el) => document.documentElement.appendChild(el));
        originalSwap();
        ids.forEach(({ el, id }) => {
          const target = id ? document.body.querySelector(`[data-astro-transition-persist="${id}"]`) : null;
          if (target && target !== el) {
            target.replaceWith(el);
          } else if (el.parentElement === document.documentElement) {
            document.body.prepend(el);
          }
        });
      };
    }
    cleanup();
  });

  document.addEventListener('astro:after-swap', () => {
    syncFlags();
    document.getElementById('loader')?.remove();
  });

  document.addEventListener('astro:page-load', () => {
    if (!navigating) {
      cancelFlip();
      return void boot(setup);
    }
    navigating = false;
    const skipCurtain = flipActiveForNav;
    flipActiveForNav = false;
    enter({ transition: !skipCurtain });
  });

  boot(setup);
}
