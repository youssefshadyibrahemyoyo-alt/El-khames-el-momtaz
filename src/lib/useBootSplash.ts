import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    __ekmSplashSafetyTimer?: number;
  }
}

export const FULL_SPLASH_MIN_MS = 1850;
export const QUICK_SPLASH_MIN_MS = 600;

export function computeSplashTimings(params: {
  isQuickSession: boolean;
  elapsedMs: number;
}): { remainingHoldMs: number; fillFinishMs: number; exitDurationMs: number } {
  const targetMin = params.isQuickSession ? QUICK_SPLASH_MIN_MS : FULL_SPLASH_MIN_MS;
  const safeElapsed = Math.max(0, params.elapsedMs);
  const remainingHoldMs = Math.max(0, Math.round(targetMin - safeElapsed));
  return {
    remainingHoldMs,
    fillFinishMs: params.isQuickSession ? 130 : 190,
    exitDurationMs: params.isQuickSession ? 300 : 460,
  };
}

/**
 * Coordinates the 0ms HTML #app-boot-splash handoff once React + initial Auth/Profile are ready.
 * - Fresh tab launch: ~1.85s luxury intro with diagonal gold shimmer + EA FC bar fill.
 * - Same-tab refresh: ~0.60s quick fade.
 */
export function useBootSplash(isAppReady: boolean): void {
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!isAppReady || dismissedRef.current) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const splashEl = document.getElementById('app-boot-splash');
    if (!splashEl) {
      dismissedRef.current = true;
      return;
    }

    const isQuickSession = splashEl.getAttribute('data-mode') === 'quick';
    const elapsedMs = typeof performance !== 'undefined' ? performance.now() : 0;
    const { remainingHoldMs, fillFinishMs, exitDurationMs } = computeSplashTimings({
      isQuickSession,
      elapsedMs,
    });

    const holdTimer = window.setTimeout(() => {
      dismissedRef.current = true;
      try {
        sessionStorage.setItem('ekm_splash_seen', '1');
      } catch {
        // ignore storage restrictions
      }
      if (window.__ekmSplashSafetyTimer) {
        window.clearTimeout(window.__ekmSplashSafetyTimer);
      }
      splashEl.classList.add('is-complete');

      window.setTimeout(() => {
        splashEl.classList.add('is-exiting');
        window.setTimeout(() => {
          splashEl.remove();
        }, exitDurationMs);
      }, fillFinishMs);
    }, remainingHoldMs);

    return () => {
      window.clearTimeout(holdTimer);
    };
  }, [isAppReady]);
}
