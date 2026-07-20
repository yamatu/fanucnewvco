'use client';

import { useEffect } from 'react';

const CLARITY_PROJECT_ID = 't9h8f5viyl';

export default function Clarity() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

    let loaded = false;
    let idleId: number | undefined;

    const inject = () => {
      if (loaded || document.querySelector('script[src*="clarity.ms"]')) return;
      loaded = true;

      const clarityWindow = window as typeof window & {
        clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] };
      };
      clarityWindow.clarity =
        clarityWindow.clarity ||
        function (...args: unknown[]) {
          const queue = clarityWindow.clarity?.q || [];
          queue.push(args);
          if (clarityWindow.clarity) clarityWindow.clarity.q = queue;
        };

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
      document.head.appendChild(script);
    };

    const schedule = () => {
      removeInteractionListeners();
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(inject, { timeout: 2000 });
      } else {
        inject();
      }
    };
    const interactionEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    const removeInteractionListeners = () => {
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, schedule));
    };

    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, schedule, { once: true, passive: true }),
    );
    const delayId = window.setTimeout(schedule, 8000);

    return () => {
      window.clearTimeout(delayId);
      removeInteractionListeners();
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  return null;
}
