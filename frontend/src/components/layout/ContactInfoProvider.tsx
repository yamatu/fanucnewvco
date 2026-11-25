'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_CONTACT_INFO, type SiteContactInfo } from '@/lib/contact-info';

/**
 * Contact details resolved from the Contact page record by the root layout.
 * Client components (header, footer, account area) read them from here so the
 * phone, email and business hours have exactly one source of truth.
 */
const ContactInfoContext = createContext<SiteContactInfo>(DEFAULT_CONTACT_INFO);

export function ContactInfoProvider({
  value,
  children,
}: {
  value: SiteContactInfo;
  children: ReactNode;
}) {
  return <ContactInfoContext.Provider value={value}>{children}</ContactInfoContext.Provider>;
}

export function useSiteContactInfo(): SiteContactInfo {
  return useContext(ContactInfoContext);
}
