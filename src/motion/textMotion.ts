import { gsap } from 'gsap';
import { prefersReducedMotion, scrollState } from '../engine';

const getWordsFromNode = (node: Node, out: Array<{ type: 'word'; text: string } | { type: 'space'; text: string } | { type: 'br' }>) => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as Element;
    if (elem.tagName === 'BR') {
      out.push({ type: 'br' });
      return;
    }
    Array.from(elem.childNodes).forEach((child) => getWordsFromNode(child, out));
    return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent || '';
    const tokens = raw.split(/(\s+)/);
    for (const token of tokens) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        out.push({ type: 'space', text: ' ' });
      } else {
        out.push({ type: 'word', text: token });
      }
    }
  }
};

function setupProximityElement(
  el: HTMLElement,
  signal: AbortSignal,
  restoreTasks: Array<() => void>
) {
  const rawText = (el.textContent || '').trim();
  if (!rawText) return;

  const originalHTML = el.innerHTML;
  const hadAriaLabel = el.hasAttribute('aria-label');
  const prevAriaLabel = el.getAttribute('aria-label');

  if (!hadAriaLabel) {
    el.setAttribute('aria-label', rawText);
  }
  el.dataset.rxBound = '1';

  const fragment = document.createDocumentFragment();
  const charElements: HTMLSpanElement[] = [];

  for (const ch of Array.from(rawText)) {
    const span = document.createElement('span');
    span.className = 'rx-char';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    fragment.appendChild(span);
    charElements.push(span);
  }

  el.replaceChildren(fragment);

  let box: { left: number; top: number; width: number; height: number } | null = null;
  const litState: boolean[] = new Array(charElements.length).fill(false);
  let isRippling = false;
  let rippleCooldownId: number | undefined;
  let pendingPoint: { x: number; y: number } | null = null;
  let moveRafId = 0;

  const measureBox = () => {
    if (signal.aborted || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    box = {
      left: r.left,
      top: r.top + scrollState().y,
      width: r.width,
      height: r.height,
    };
  };

  const invalidateMeasure = () => {
    box = null;
  };
  window.addEventListener('resize', invalidateMeasure, { passive: true, signal });

  const setLit = (idx: number, lit: boolean) => {
    if (litState[idx] === lit) return;
    litState[idx] = lit;
    charElements[idx].classList.toggle('is-lit', lit);
  };

  const resetChars = () => {
    cancelAnimationFrame(moveRafId);
    moveRafId = 0;
    pendingPoint = null;
    if (isRippling) return;
    for (let i = 0; i < charElements.length; i++) {
      if (charElements[i].style.transform) charElements[i].style.transform = '';
      setLit(i, false);
    }
  };

  const applyProximityNow = (clientX: number, clientY: number) => {
    if (isRippling || signal.aborted) return;
    if (!box) measureBox();
    if (!box || box.width <= 0) return;

    const count = charElements.length;
    const avgWidth = Math.max(20, box.width / count);
    const radius = Math.max(96, Math.min(250, avgWidth * 2.65));
    const maxLift = Math.max(12, Math.min(24, box.height * 0.16));
    const pointerDocY = clientY + scrollState().y;
    const centerY = box.top + box.height / 2;

    for (let i = 0; i < count; i++) {
      const charCenterX = box.left + ((i + 0.5) / count) * box.width;
      const dx = charCenterX - clientX;
      const dy = centerY - pointerDocY;
      const dist = Math.hypot(dx, dy * 0.72);
      if (dist < radius) {
        const t = 1 - dist / radius;
        const falloff = t * t * (3 - 2 * t);
        charElements[i].style.transform =
          falloff > 0.02 ? `translate3d(0, ${(-maxLift * falloff).toFixed(1)}px, 0)` : '';
        setLit(i, falloff > 0.24);
      } else {
        if (charElements[i].style.transform) charElements[i].style.transform = '';
        setLit(i, false);
      }
    }
  };

  const scheduleProximity = (clientX: number, clientY: number) => {
    pendingPoint = { x: clientX, y: clientY };
    if (moveRafId) return;
    moveRafId = requestAnimationFrame(() => {
      moveRafId = 0;
      const pt = pendingPoint;
      pendingPoint = null;
      if (pt) applyProximityNow(pt.x, pt.y);
    });
  };

  const findNearestCharIndex = (clientX: number): number => {
    if (!box) measureBox();
    if (!box || box.width <= 0) return 0;
    return Math.max(0, Math.min(charElements.length - 1, Math.floor(((clientX - box.left) / box.width) * charElements.length)));
  };

  el.addEventListener(
    'pointerenter',
    () => {
      measureBox();
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      scheduleProximity(e.clientX, e.clientY);
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'pointerleave',
    () => {
      isRippling = false;
      window.clearTimeout(rippleCooldownId);
      resetChars();
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      measureBox();
      const touch = e.touches[0];
      if (touch) scheduleProximity(touch.clientX, touch.clientY);
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) scheduleProximity(touch.clientX, touch.clientY);
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'touchend',
    () => {
      resetChars();
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'touchcancel',
    () => {
      isRippling = false;
      window.clearTimeout(rippleCooldownId);
      resetChars();
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (e.button > 0) return;
      const tappedIndex = findNearestCharIndex(e.clientX);
      isRippling = true;
      window.clearTimeout(rippleCooldownId);

      for (let i = 0; i < charElements.length; i++) {
        const dist = Math.abs(i - tappedIndex);
        setLit(i, dist <= 1);
        const lift = dist === 0 ? -18 : dist === 1 ? -9 : -3;
        charElements[i].style.transform = `translate3d(0, ${lift}px, 0)`;
      }

      rippleCooldownId = window.setTimeout(() => {
        isRippling = false;
        resetChars();
      }, 260);
    },
    { passive: true, signal }
  );

  restoreTasks.push(() => {
    cancelAnimationFrame(moveRafId);
    window.clearTimeout(rippleCooldownId);
    delete el.dataset.rxBound;
    if (!hadAriaLabel) {
      el.removeAttribute('aria-label');
    } else if (prevAriaLabel !== null) {
      el.setAttribute('aria-label', prevAriaLabel);
    }
    el.innerHTML = originalHTML;
  });
}

function setupWordsElement(
  el: HTMLElement,
  signal: AbortSignal,
  restoreTasks: Array<() => void>
) {
  const rawTokens: Array<{ type: 'word'; text: string } | { type: 'space'; text: string } | { type: 'br' }> = [];
  Array.from(el.childNodes).forEach((child) => getWordsFromNode(child, rawTokens));
  if (!rawTokens.some((t) => t.type === 'word')) return;

  const originalHTML = el.innerHTML;
  el.dataset.rxBound = '1';

  // Trim leading/trailing pure whitespace tokens while preserving internal spaces & <br>
  let start = 0;
  let end = rawTokens.length - 1;
  while (start <= end && rawTokens[start].type === 'space') start++;
  while (end >= start && rawTokens[end].type === 'space') end--;

  const fragment = document.createDocumentFragment();
  let wordCount = 0;

  for (let i = start; i <= end; i++) {
    const tok = rawTokens[i];
    if (tok.type === 'br') {
      fragment.appendChild(document.createElement('br'));
    } else if (tok.type === 'space') {
      const prev = rawTokens[i - 1];
      const next = rawTokens[i + 1];
      if (prev?.type === 'br' || next?.type === 'br') continue;
      fragment.appendChild(document.createTextNode(' '));
    } else {
      const span = document.createElement('span');
      span.className = 'rx-word';
      span.textContent = tok.text;
      fragment.appendChild(span);
      wordCount++;
    }
  }

  el.replaceChildren(fragment);
  if (!wordCount) return;

  let activeWord: HTMLElement | null = null;
  let touchResetTimer: number | undefined;

  const setActiveWord = (word: HTMLElement | null) => {
    if (activeWord && activeWord !== word) {
      activeWord.style.transform = '';
      activeWord.classList.remove('is-active');
    }
    activeWord = word;
    if (word) {
      word.style.transform = 'translate3d(0, -3px, 0)';
      word.classList.add('is-active');
    }
  };

  el.addEventListener(
    'pointerover',
    (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const word = (e.target as Element | null)?.closest<HTMLElement>('.rx-word') ?? null;
      if (word && word !== activeWord) setActiveWord(word);
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'pointerout',
    (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const word = (e.target as Element | null)?.closest<HTMLElement>('.rx-word');
      if (!word || word !== activeWord) return;
      const related = e.relatedTarget as Node | null;
      if (related && word.contains(related)) return;
      setActiveWord(null);
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'pointerleave',
    (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setActiveWord(null);
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      window.clearTimeout(touchResetTimer);
      const word = (e.target as Element | null)?.closest<HTMLElement>('.rx-word') ?? null;
      setActiveWord(word);
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'touchend',
    () => {
      window.clearTimeout(touchResetTimer);
      touchResetTimer = window.setTimeout(() => setActiveWord(null), 220);
    },
    { passive: true, signal }
  );

  el.addEventListener(
    'touchcancel',
    () => {
      window.clearTimeout(touchResetTimer);
      setActiveWord(null);
    },
    { passive: true, signal }
  );

  restoreTasks.push(() => {
    window.clearTimeout(touchResetTimer);
    delete el.dataset.rxBound;
    el.innerHTML = originalHTML;
  });
}

function setupRollElement(
  el: HTMLElement,
  signal: AbortSignal,
  restoreTasks: Array<() => void>
) {
  const text = (el.textContent || '').trim();
  if (!text) return;

  const originalHTML = el.innerHTML;
  el.dataset.rxBound = '1';

  let chars: HTMLSpanElement[] | null = null;
  const ensureBuilt = () => {
    if (chars) return chars;
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;

    const track = document.createElement('span');
    track.className = 'rx-roll';
    track.setAttribute('aria-hidden', 'true');

    chars = [];
    for (const ch of Array.from(text)) {
      const glyph = ch === ' ' ? '\u00A0' : ch;
      const outer = document.createElement('span');
      outer.className = 'rx-roll__char';
      outer.textContent = glyph;

      const dup = document.createElement('span');
      dup.className = 'rx-roll__dup';
      dup.textContent = glyph;
      outer.appendChild(dup);

      track.appendChild(outer);
      chars.push(outer);
    }

    el.replaceChildren(sr, track);
    return chars;
  };

  const trigger = el.closest<HTMLElement>('a, button') ?? el;
  const playRoll = () => {
    const builtChars = ensureBuilt();
    gsap.fromTo(
      builtChars,
      { yPercent: 0 },
      {
        yPercent: -100,
        stagger: 0.015,
        duration: 0.34,
        ease: 'power3.out',
        overwrite: true,
        onComplete: () => {
          gsap.set(builtChars, { yPercent: 0 });
        },
      }
    );
  };

  trigger.addEventListener(
    'pointerenter',
    (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      playRoll();
    },
    { passive: true, signal }
  );

  trigger.addEventListener(
    'touchstart',
    () => {
      playRoll();
    },
    { passive: true, signal }
  );

  restoreTasks.push(() => {
    delete el.dataset.rxBound;
    el.innerHTML = originalHTML;
  });
}

export function initReactiveText(): (() => void) | void {
  if (prefersReducedMotion()) return;

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-text-reactive]'));
  if (!targets.length) return;

  const controller = new AbortController();
  const { signal } = controller;
  const restoreTasks: Array<() => void> = [];

  const ctx = gsap.context(() => {
    for (const el of targets) {
      if (el.dataset.rxBound === '1') continue;
      const mode = el.dataset.textReactive;
      if (mode === 'proximity') {
        setupProximityElement(el, signal, restoreTasks);
      } else if (mode === 'words') {
        setupWordsElement(el, signal, restoreTasks);
      } else if (mode === 'roll') {
        setupRollElement(el, signal, restoreTasks);
      }
    }
  }, document);

  let cleaned = false;
  const teardown = () => {
    if (cleaned) return;
    cleaned = true;
    controller.abort();
    ctx.revert();
    restoreTasks.splice(0).forEach((fn) => fn());
  };

  document.addEventListener('astro:before-swap', teardown, { once: true, signal });

  return teardown;
}
