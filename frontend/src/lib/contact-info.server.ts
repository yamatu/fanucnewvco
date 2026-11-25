import { getEditablePageData } from '@/services/page-content.server';
import { DEFAULT_CONTACT_INFO, resolveContactInfo, type SiteContactInfo } from '@/lib/contact-info';

/**
 * Reads the phone, email and business hours from the Contact page record the
 * admin edits in the homepage editor — the same fetch the Contact page itself
 * makes, so it is deduplicated within a render. Falls back to the built-in copy
 * when the backend is unreachable.
 */
export async function getSiteContactInfo(): Promise<SiteContactInfo> {
  try {
    return resolveContactInfo(await getEditablePageData('contact'));
  } catch {
    return DEFAULT_CONTACT_INFO;
  }
}
