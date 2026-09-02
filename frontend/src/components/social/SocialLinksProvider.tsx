'use client';

import type { SocialLinksPublicConfig } from '@/lib/social-links';
import SocialLinksService from '@/services/social-links.service';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

const SocialLinksContext = createContext<SocialLinksPublicConfig | null>(null);

export function SocialLinksProvider({
  children,
  initialConfig,
}: {
  children: ReactNode;
  initialConfig: SocialLinksPublicConfig | null;
}) {
  const [fallbackConfig, setFallbackConfig] = useState<SocialLinksPublicConfig | null>(null);

  useEffect(() => {
    if (initialConfig) return;

    let cancelled = false;
    void SocialLinksService.getPublicConfig()
      .then((nextConfig) => {
        if (!cancelled) setFallbackConfig(nextConfig);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [initialConfig]);

  return (
    <SocialLinksContext.Provider value={initialConfig ?? fallbackConfig}>
      {children}
    </SocialLinksContext.Provider>
  );
}

export function useSocialLinks(): SocialLinksPublicConfig | null {
  return useContext(SocialLinksContext);
}
