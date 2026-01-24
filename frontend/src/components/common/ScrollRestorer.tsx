'use client';

import { useEffect } from 'react';

type Props = {
  storageKey: string;
};

export default function ScrollRestorer({ storageKey }: Props) {
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return;
      const y = Number(raw);
      if (!Number.isFinite(y) || y < 0) return;

      // Clear first so a subsequent full refresh doesn't jump unexpectedly.
      window.sessionStorage.removeItem(storageKey);

      // Defer until after layout paint.
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0 });
      });
    } catch {
      // ignore
    }
  }, [storageKey]);

  return null;
}
