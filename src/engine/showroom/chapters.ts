import type { ShowroomWaypoint } from '../../data/site';
import { getScrollLimit, scrollToTarget } from '../scroll';
import { studioAudio } from '../audio';

export class ChapterBar {
  private waypoints: ShowroomWaypoint[];
  private buttons: HTMLButtonElement[];
  private fillEl: HTMLElement | null;
  private bannerEl: HTMLElement | null;
  private bannerIndexEl: HTMLElement | null;
  private bannerTitleEl: HTMLElement | null;
  private activeIdx = -1;
  private bannerTimer: number | null = null;
  private onJump?: () => void;
  private scrollTargetResolver?: (u: number) => number;

  constructor(
    root: HTMLElement,
    waypoints: ShowroomWaypoint[],
    signal: AbortSignal,
    onJump?: () => void,
    scrollTargetResolver?: (u: number) => number
  ) {
    this.waypoints = waypoints;
    this.onJump = onJump;
    this.scrollTargetResolver = scrollTargetResolver;
    this.buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-chapter-btn]')];
    this.fillEl = root.querySelector('[data-chapter-fill]');
    this.bannerEl = root.querySelector('[data-room-banner]');
    this.bannerIndexEl = root.querySelector('[data-room-banner-index]');
    this.bannerTitleEl = root.querySelector('[data-room-banner-title]');

    this.buttons.forEach((btn, idx) => {
      btn.addEventListener(
        'click',
        () => {
          btn.blur();
          this.jumpToIndex(idx);
        },
        { signal }
      );
      btn.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            const next = Math.min(this.buttons.length - 1, idx + 1);
            this.buttons[next]?.focus();
            this.jumpToIndex(next);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prev = Math.max(0, idx - 1);
            this.buttons[prev]?.focus();
            this.jumpToIndex(prev);
          }
        },
        { signal }
      );
    });

    signal.addEventListener(
      'abort',
      () => {
        if (this.bannerTimer !== null) window.clearTimeout(this.bannerTimer);
      },
      { once: true }
    );
  }

  public jumpToIndex(idx: number) {
    const wp = this.waypoints[idx];
    if (!wp) return;
    studioAudio.tick(560, 0.025);
    this.onJump?.();
    const targetY = this.scrollTargetResolver
      ? this.scrollTargetResolver(wp.u)
      : wp.u * getScrollLimit();
    scrollToTarget(targetY, { duration: 1.2 });
  }

  public update(progressU: number, isInitial = false) {
    if (this.fillEl) {
      this.fillEl.style.transform = `scaleX(${Math.max(0, Math.min(1, progressU))})`;
    }

    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < this.waypoints.length; i++) {
      const d = Math.abs(progressU - this.waypoints[i].u);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    if (nearestIdx !== this.activeIdx) {
      this.activeIdx = nearestIdx;
      this.buttons.forEach((btn, i) => {
        const active = i === nearestIdx;
        btn.classList.toggle('is-active', active);
        if (active) btn.setAttribute('aria-current', 'step');
        else btn.removeAttribute('aria-current');
      });

      const wp = this.waypoints[nearestIdx];
      if (wp && !isInitial) {
        this.flashRoomBanner(wp);
      }
    }
  }

  private flashRoomBanner(wp: ShowroomWaypoint) {
    if (!this.bannerEl) return;
    if (this.bannerIndexEl) this.bannerIndexEl.textContent = wp.index;
    if (this.bannerTitleEl) this.bannerTitleEl.textContent = wp.label;

    this.bannerEl.classList.add('is-visible');
    if (this.bannerTimer !== null) window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => {
      this.bannerEl?.classList.remove('is-visible');
    }, 1750);
  }
}
