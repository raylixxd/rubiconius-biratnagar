import { boot, cleanup, enter, leave, syncFlags } from './index';
import { scrollToTarget } from './scroll';

let navigating = false;
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
    const load = e.loader;
    e.loader = async () => { await Promise.all([leave(), load()]); };
  });
  document.addEventListener('astro:before-swap', () => cleanup());
  document.addEventListener('astro:after-swap', () => {
    syncFlags();
    document.getElementById('loader')?.remove();
  });
  document.addEventListener('astro:page-load', () => {
    if (!navigating) return void boot(setup);
    navigating = false;
    enter();
  });
  boot(setup);
}
