'use client';

import { useEffect } from 'react';

const CLARITY_PROJECT_ID = 't9h8f5viyl';
const CLARITY_DELAY_MS = 6000;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function Clarity() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Don't load Clarity on local dev to avoid noisy network errors.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

    const idleWindow = window as IdleWindow;
    let delayHandle: number | undefined;
    let idleHandle: number | undefined;

    const loadClarity = () => {
      if (document.querySelector('script[src*="clarity.ms"]')) return;

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.innerHTML = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
      `;
      document.head.appendChild(script);
    };

    const scheduleClarity = () => {
      delayHandle = window.setTimeout(() => {
        if (idleWindow.requestIdleCallback) {
          idleHandle = idleWindow.requestIdleCallback(loadClarity, { timeout: 3000 });
        } else {
          loadClarity();
        }
      }, CLARITY_DELAY_MS);
    };

    if (document.readyState === 'complete') scheduleClarity();
    else window.addEventListener('load', scheduleClarity, { once: true });

    return () => {
      window.removeEventListener('load', scheduleClarity);
      if (delayHandle !== undefined) window.clearTimeout(delayHandle);
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
    };
  }, []);

  return null;
}
