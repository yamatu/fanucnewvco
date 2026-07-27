'use client';

import type { SocialLinksPublicConfig } from '@/lib/social-links';
import SocialLinksService from '@/services/social-links.service';
import { useQuery } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext } from 'react';

const SocialLinksContext = createContext<SocialLinksPublicConfig | null>(null);

export function SocialLinksProvider({
  children,
  initialConfig,
}: {
  children: ReactNode;
  initialConfig: SocialLinksPublicConfig | null;
}) {
  const { data } = useQuery({
    queryKey: ['public', 'social-links'],
    queryFn: () => SocialLinksService.getPublicConfig(),
    initialData: initialConfig ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <SocialLinksContext.Provider value={data ?? initialConfig}>
      {children}
    </SocialLinksContext.Provider>
  );
}

export function useSocialLinks(): SocialLinksPublicConfig | null {
  return useContext(SocialLinksContext);
}
