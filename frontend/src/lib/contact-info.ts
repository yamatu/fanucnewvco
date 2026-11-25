import { CONTACT_PAGE_SCHEMA } from '@/lib/page-content-schema';
import { createPageText, type PageData } from '@/lib/page-content';
import {
  DEFAULT_OPENING_HOURS,
  formatBusinessHours,
  parseBusinessHours,
  type OpeningHoursSpec,
} from '@/lib/business-hours';

/**
 * Contact details as published on the Contact page. Every place that repeats
 * them (JSON-LD, llms.txt, the policy pages) reads this object instead of
 * hard-coding another copy.
 */
export interface SiteContactInfo {
  /** Phone exactly as published, e.g. "+86 13348028050". */
  phone: string;
  /** The same number without formatting, for tel: links and schema.org. */
  telephone: string;
  email: string;
  /** Raw multi-line copy from the CMS, shown on the Contact page. */
  hoursText: string;
  /** One line for prose, without the timezone: "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 5:00 PM". */
  hoursSummary: string;
  openingHours: OpeningHoursSpec[];
}

function toTelephone(raw: string): string {
  const compact = raw.replace(/[^\d+]/g, '');
  return compact || raw.trim();
}

export function resolveContactInfo(data: PageData = {}): SiteContactInfo {
  const text = createPageText(CONTACT_PAGE_SCHEMA, data);
  const phone = text('phone');
  const email = text('email');
  const hoursText = text('hours');

  const parsed = parseBusinessHours(hoursText);
  const openingHours = parsed.length > 0 ? parsed : DEFAULT_OPENING_HOURS;

  return {
    phone,
    telephone: toTelephone(phone),
    email,
    hoursText,
    hoursSummary: formatBusinessHours(openingHours),
    openingHours,
  };
}

/** Built-in copy, used when the CMS cannot be reached (e.g. during the build). */
export const DEFAULT_CONTACT_INFO: SiteContactInfo = resolveContactInfo();
