'use client';

import { useEffect, useState, type ComponentType } from 'react';
import type { ToasterProps } from 'react-hot-toast';

const TOASTER_DELAY_MS = 6000;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const toasterProps: ToasterProps = {
  position: 'top-right',
  toastOptions: {
    duration: 4000,
    style: {
      background: '#363636',
      color: '#fff',
    },
    success: {
      duration: 3000,
      iconTheme: {
        primary: '#10B981',
        secondary: '#fff',
      },
    },
    error: {
      duration: 5000,
      iconTheme: {
        primary: '#EF4444',
        secondary: '#fff',
      },
    },
  },
};

export default function DeferredToaster() {
  const [ToasterComponent, setToasterComponent] = useState<ComponentType<ToasterProps> | null>(null);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    let idleHandle: number | undefined;
    let cancelled = false;

    const loadToaster = async () => {
      const { Toaster } = await import('react-hot-toast');
      if (!cancelled) setToasterComponent(() => Toaster);
    };

    const delayHandle = window.setTimeout(() => {
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(() => void loadToaster(), { timeout: 3000 });
      } else {
        void loadToaster();
      }
    }, TOASTER_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(delayHandle);
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
    };
  }, []);

  return ToasterComponent ? <ToasterComponent {...toasterProps} /> : null;
}
