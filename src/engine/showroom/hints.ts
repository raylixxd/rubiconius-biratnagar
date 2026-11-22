import { isTouch } from '../env';

const STORAGE_KEY = 'rubiconius_showroom_hint_seen';

export class ScrollHint {
  private el: HTMLElement | null;
  private dismissed = false;

  constructor(root: HTMLElement, signal: AbortSignal) {
    this.el = root.querySelector<HTMLElement>('[data-showroom-hint]');
    if (!this.el) return;

    this.el.textContent = isTouch() ? 'Swipe to walk' : 'Scroll to walk · Drag to look';

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') {
        this.dismissed = true;
        this.el.classList.add('is-dismissed');
        return;
      }
    } catch {}

    const dismiss = () => this.dismiss();
    window.addEventListener('wheel', dismiss, { passive: true, once: true, signal });
    window.addEventListener('touchstart', dismiss, { passive: true, once: true, signal });
    window.addEventListener('keydown', dismiss, { passive: true, once: true, signal });
  }

  public dismiss() {
    if (this.dismissed || !this.el) return;
    this.dismissed = true;
    this.el.classList.add('is-dismissed');
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  }
}
