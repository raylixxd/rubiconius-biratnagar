export type HeroVideoState =
  | 'poster'
  | 'playing'
  | 'pausedByUser'
  | 'pausedOffscreen'
  | 'reducedMotion';

export type HeroVideoEvent =
  | 'CAN_PLAY'
  | 'USER_TOGGLE'
  | 'OUT_OF_VIEW'
  | 'IN_VIEW'
  | 'PLAY_FAILED';

export interface HeroVideoContext {
  inView: boolean;
  canPlay: boolean;
  userPaused: boolean;
  autoplayBlocked: boolean;
  reducedMotion: boolean;
}

export interface HeroVideoSnapshot {
  state: HeroVideoState;
  context: HeroVideoContext;
}

export interface HeroVideoOptions {
  reducedMotion?: boolean;
  inView?: boolean;
  canPlay?: boolean;
}

export type HeroVideoListener = (snapshot: HeroVideoSnapshot) => void;

const canAutoResume = (ctx: HeroVideoContext): boolean =>
  !ctx.reducedMotion && ctx.canPlay && ctx.inView && !ctx.userPaused && !ctx.autoplayBlocked;

/**
 * Pure deterministic finite state transition for hero video playback.
 * Guards ensure:
 * - No event ever exits `reducedMotion`
 * - `IN_VIEW` never exits `pausedByUser`
 * - `OUT_OF_VIEW` pauses active playback to `pausedOffscreen`
 */
export function transitionHeroVideo(
  snapshot: HeroVideoSnapshot,
  event: HeroVideoEvent
): HeroVideoSnapshot {
  const { state, context } = snapshot;

  // Hard guard: reducedMotion is an absorbing terminal state.
  if (state === 'reducedMotion' || context.reducedMotion) {
    return state === 'reducedMotion'
      ? snapshot
      : { state: 'reducedMotion', context: { ...context, reducedMotion: true } };
  }

  switch (event) {
    case 'CAN_PLAY': {
      const nextCtx: HeroVideoContext = { ...context, canPlay: true };
      if (state === 'pausedByUser' || nextCtx.userPaused) {
        return { state: 'pausedByUser', context: nextCtx };
      }
      if (!nextCtx.inView) {
        return { state: 'pausedOffscreen', context: nextCtx };
      }
      if (nextCtx.autoplayBlocked) {
        return { state: 'poster', context: nextCtx };
      }
      return { state: 'playing', context: nextCtx };
    }

    case 'USER_TOGGLE': {
      // If browser blocked initial autoplay, a manual toggle acts as an explicit Play gesture.
      if (context.autoplayBlocked) {
        const nextCtx: HeroVideoContext = {
          ...context,
          autoplayBlocked: false,
          userPaused: false,
        };
        if (nextCtx.canPlay && nextCtx.inView) {
          return { state: 'playing', context: nextCtx };
        }
        return {
          state: nextCtx.canPlay ? 'pausedOffscreen' : 'poster',
          context: nextCtx,
        };
      }

      if (state === 'pausedByUser' || context.userPaused) {
        const nextCtx: HeroVideoContext = { ...context, userPaused: false };
        if (nextCtx.canPlay && nextCtx.inView) {
          return { state: 'playing', context: nextCtx };
        }
        if (nextCtx.canPlay && !nextCtx.inView) {
          return { state: 'pausedOffscreen', context: nextCtx };
        }
        return { state: 'poster', context: nextCtx };
      }

      const nextCtx: HeroVideoContext = { ...context, userPaused: true };
      return { state: 'pausedByUser', context: nextCtx };
    }

    case 'OUT_OF_VIEW': {
      const nextCtx: HeroVideoContext = { ...context, inView: false };
      if (state === 'pausedByUser') {
        return { state: 'pausedByUser', context: nextCtx };
      }
      if (!nextCtx.autoplayBlocked && (state === 'playing' || nextCtx.canPlay)) {
        return { state: 'pausedOffscreen', context: nextCtx };
      }
      return { state: 'poster', context: nextCtx };
    }

    case 'IN_VIEW': {
      const nextCtx: HeroVideoContext = { ...context, inView: true };
      // Guard: IN_VIEW must never exit pausedByUser.
      if (state === 'pausedByUser' || nextCtx.userPaused) {
        return { state: 'pausedByUser', context: nextCtx };
      }
      if (canAutoResume(nextCtx)) {
        return { state: 'playing', context: nextCtx };
      }
      return { state: 'poster', context: nextCtx };
    }

    case 'PLAY_FAILED': {
      const nextCtx: HeroVideoContext = { ...context, autoplayBlocked: true };
      if (state === 'pausedByUser') {
        return { state: 'pausedByUser', context: nextCtx };
      }
      return { state: 'poster', context: nextCtx };
    }
  }
}

export function createHeroVideoMachine(options: HeroVideoOptions = {}) {
  const reducedMotion = Boolean(options.reducedMotion);
  const inView = options.inView ?? true;
  const canPlay = options.canPlay ?? false;

  let snapshot: HeroVideoSnapshot = {
    state: reducedMotion ? 'reducedMotion' : canPlay && inView ? 'playing' : 'poster',
    context: {
      inView,
      canPlay,
      userPaused: false,
      autoplayBlocked: false,
      reducedMotion,
    },
  };

  const listeners = new Set<HeroVideoListener>();

  return {
    getSnapshot(): HeroVideoSnapshot {
      return snapshot;
    },
    matches(target: HeroVideoState): boolean {
      return snapshot.state === target;
    },
    send(event: HeroVideoEvent): HeroVideoSnapshot {
      const prev = snapshot;
      const next = transitionHeroVideo(prev, event);
      snapshot = next;
      if (
        next.state !== prev.state ||
        next.context.inView !== prev.context.inView ||
        next.context.canPlay !== prev.context.canPlay ||
        next.context.userPaused !== prev.context.userPaused ||
        next.context.autoplayBlocked !== prev.context.autoplayBlocked
      ) {
        listeners.forEach((fn) => fn(next));
      }
      return next;
    },
    subscribe(listener: HeroVideoListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
