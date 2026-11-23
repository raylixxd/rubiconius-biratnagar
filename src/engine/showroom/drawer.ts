import { materialStudies, site, type MaterialStudyNote } from '../../data/site';
import { startScroll, stopScroll } from '../scroll';
import { studioAudio } from '../audio';

export class MaterialDrawer {
  private root: HTMLElement;
  private codeEl: HTMLElement | null;
  private titleEl: HTMLElement | null;
  private discEl: HTMLElement | null;
  private imgEl: HTMLImageElement | null;
  private summaryEl: HTMLElement | null;
  private materialsEl: HTMLElement | null;
  private studyLinkEl: HTMLAnchorElement | null;
  private inquireLinkEl: HTMLAnchorElement | null;
  private closeBtn: HTMLButtonElement | null;
  private backdrop: HTMLElement | null;
  private isOpenState = false;
  private lastFocused: HTMLElement | null = null;
  private onCloseCb: () => void;

  constructor(root: HTMLElement, signal: AbortSignal, onClose: () => void) {
    this.root = root;
    this.onCloseCb = onClose;
    this.codeEl = root.querySelector('[data-sdrawer-code]');
    this.titleEl = root.querySelector('[data-sdrawer-title]');
    this.discEl = root.querySelector('[data-sdrawer-disc]');
    this.imgEl = root.querySelector('[data-sdrawer-img]');
    this.summaryEl = root.querySelector('[data-sdrawer-summary]');
    this.materialsEl = root.querySelector('[data-sdrawer-materials]');
    this.studyLinkEl = root.querySelector('[data-sdrawer-study]');
    this.inquireLinkEl = root.querySelector('[data-sdrawer-inquire]');
    this.closeBtn = root.querySelector('[data-sdrawer-close]');
    this.backdrop = root.querySelector('[data-sdrawer-backdrop]');

    this.closeBtn?.addEventListener('click', () => this.close(), { signal });
    this.backdrop?.addEventListener('click', () => this.close(), { signal });
    window.addEventListener('keydown', this.onKeyDown, { signal });
  }

  public isOpen() {
    return this.isOpenState;
  }

  public openBySlug(slug: string) {
    const study: MaterialStudyNote | undefined = materialStudies.find((s) => s.key === slug);
    if (!study) return;

    this.lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (this.codeEl) this.codeEl.textContent = study.category;
    if (this.titleEl) this.titleEl.textContent = study.title;
    if (this.discEl) this.discEl.textContent = 'Concept Preview · Material Palette';
    if (this.imgEl) {
      this.imgEl.src = study.image.src;
      this.imgEl.alt = study.alt;
    }
    if (this.summaryEl) this.summaryEl.textContent = study.summary;

    if (this.materialsEl) {
      this.materialsEl.innerHTML = '';
      for (const mat of study.materials) {
        const li = document.createElement('li');
        li.textContent = mat;
        this.materialsEl.appendChild(li);
      }
    }

    if (this.studyLinkEl) {
      this.studyLinkEl.href = '/works/';
      const lbl = this.studyLinkEl.querySelector('span');
      if (lbl) lbl.textContent = 'Explore Completed Works';
    }

    if (this.inquireLinkEl) {
      const msg = `Namaste ${site.founder} ji, I was exploring the ${site.name} 3D Material Study and would like to discuss ${study.title} finishes for my space.`;
      this.inquireLinkEl.href = `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(msg)}`;
    }

    this.root.hidden = false;
    requestAnimationFrame(() => {
      this.root.classList.add('is-open');
    });
    this.isOpenState = true;
    stopScroll();
    this.closeBtn?.focus();
  }

  public close() {
    if (!this.isOpenState) return;
    this.isOpenState = false;
    this.root.classList.remove('is-open');
    studioAudio.tick(420, 0.02);
    startScroll();
    this.onCloseCb();

    const finish = () => {
      if (!this.isOpenState) this.root.hidden = true;
    };
    window.setTimeout(finish, 480);
    this.lastFocused?.focus();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.isOpenState) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === 'Tab') {
      const focusables = [
        ...this.root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ];
      if (!focusables.length) return;
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
  };
}
