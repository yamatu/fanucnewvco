/**
 * One source of truth for the opening hours.
 *
 * The Contact page is the admin-editable copy. Everything else (JSON-LD,
 * llms.txt, the policy pages, the footer) renders what this module returns, so
 * the site can no longer publish "Mon-Fri only" in one place and "Mon-Fri plus
 * Saturday" in another.
 */

export interface OpeningHoursSpec {
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

/** Business hours are published in China Standard Time (UTC+8). */
export const BUSINESS_TIMEZONE_LABEL = 'GMT+8';

/** Default copy for the Contact page "Business hours" field. */
export const DEFAULT_BUSINESS_HOURS_TEXT =
  'Monday - Friday: 8:00 AM - 6:00 PM\nSaturday: 9:00 AM - 5:00 PM\nSunday: Closed';

const DAY_NAMES: readonly string[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DAY_INDEX: Record<string, number> = {
  mon: 0,
  monday: 0,
  tue: 1,
  tues: 1,
  tuesday: 1,
  wed: 2,
  weds: 2,
  wednesday: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  fri: 4,
  friday: 4,
  sat: 5,
  saturday: 5,
  sun: 6,
  sunday: 6,
};

/** "Daily", "every day", "7 days", 每天 — no day list needed. */
const DAILY_RE = /daily|every\s*day|each\s*day|7\s*days|每天|全年无休/i;

// 8:00 AM - 6:00 PM / 08:00-18:00 / 9 AM to 5 PM
const TIME_RANGE =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to|until|through)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

function toMinutes(hours: string, minutes: string | undefined, meridiem: string | undefined): number | null {
  let hour = Number(hours);
  const minute = minutes ? Number(minutes) : 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute > 59) return null;

  const suffix = meridiem?.toLowerCase();
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  if (hour > 23) return null;

  return hour * 60 + minute;
}

function toClock(total: number): string {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 18:00 -> 6:00 PM, matching how the site has always written business hours. */
function to12Hour(clock: string): string {
  const [hours, minutes] = clock.split(':');
  const hour = Number(hours);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minutes} ${suffix}`;
}

function dayIndex(token: string): number | null {
  const key = token.toLowerCase().replace(/\./g, '').trim();
  return Object.prototype.hasOwnProperty.call(DAY_INDEX, key) ? DAY_INDEX[key] : null;
}

function firstWord(text: string): string {
  const match = text.trim().match(/^[A-Za-z.]+/);
  return match ? match[0] : '';
}

/**
 * "Mon-Fri 8:00-18:00, Sat 9:00-17:00" is two rules, but "Mon, Tue, Wed: 9-5"
 * is one. A comma starts a new rule only once the current one already holds a
 * time range and the next part starts with a day name (or closes the rule).
 */
function splitSegments(line: string): string[] {
  const parts = line.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean);
  const segments: string[] = [];
  let buffer = '';

  for (const part of parts) {
    const startsNewRule =
      buffer !== '' &&
      (/clos/i.test(buffer) || (dayIndex(firstWord(part)) !== null && TIME_RANGE.test(buffer)));

    if (startsNewRule) {
      segments.push(buffer);
      buffer = part;
    } else {
      buffer = buffer ? `${buffer}, ${part}` : part;
    }
  }

  if (buffer) segments.push(buffer);
  return segments;
}

function parseDays(text: string): string[] {
  if (DAILY_RE.test(text)) return [...DAY_NAMES];

  const found: number[] = [];
  let rest = text;

  // "Monday - Friday", "Mon-Fri", "Mon to Fri"
  const rangeRe = /([A-Za-z.]+)\s*(?:-|–|—|to|through)\s*([A-Za-z.]+)/g;
  let match: RegExpExecArray | null;
  while ((match = rangeRe.exec(text)) !== null) {
    const from = dayIndex(match[1]);
    const to = dayIndex(match[2]);
    if (from === null || to === null || to < from) continue;
    for (let index = from; index <= to; index += 1) found.push(index);
    rest = rest.replace(match[0], ' ');
  }

  // Remaining single days: "Saturday", "Sun"
  for (const word of rest.match(/[A-Za-z.]+/g) ?? []) {
    const index = dayIndex(word);
    if (index !== null) found.push(index);
  }

  return [...new Set(found)].sort((a, b) => a - b).map((index) => DAY_NAMES[index]);
}

/**
 * The label ends at the first colon that is not part of a clock time, so
 * "Monday - Friday: 8:00 AM - 6:00 PM" splits after "Friday" and not at "8:".
 */
function findLabelEnd(text: string): number {
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char !== ':' && char !== '：') continue;
    if (/^\d{2}$/.test(text.slice(index + 1, index + 3))) continue;
    return index;
  }
  return -1;
}

function parseSegment(segment: string): OpeningHoursSpec | null {
  const cut = findLabelEnd(segment);
  const dayPart = cut >= 0 ? segment.slice(0, cut) : segment;
  const timePart = cut >= 0 ? segment.slice(cut + 1) : segment;

  // "Sunday: Closed" is not an opening hour.
  if (/clos|休息|关/i.test(timePart)) return null;

  const days = parseDays(dayPart);
  if (days.length === 0) return null;

  const match = timePart.match(TIME_RANGE);
  if (!match) return null;

  const opens = toMinutes(match[1], match[2], match[3]);
  const closes = toMinutes(match[4], match[5], match[6] ?? match[3]);
  if (opens === null || closes === null || closes <= opens) return null;

  return { dayOfWeek: days, opens: toClock(opens), closes: toClock(closes) };
}

/**
 * Turns the free-text field into schema.org OpeningHoursSpecification entries.
 * Unparseable lines are dropped; callers fall back to the defaults.
 */
export function parseBusinessHours(text?: string | null): OpeningHoursSpec[] {
  if (!text) return [];

  const specs: OpeningHoursSpec[] = [];
  const lines = String(text)
    .split(/[\n\r;•·]+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    for (const segment of splitSegments(line)) {
      const spec = parseSegment(segment);
      if (spec) specs.push(spec);
    }
  }

  // Never list the same day group twice.
  const seen = new Set<string>();
  return specs.filter((spec) => {
    const key = spec.dayOfWeek.join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shortDay(index: number): string {
  return DAY_NAMES[index].slice(0, 3);
}

function formatDays(days: string[]): string {
  const indexes = [...new Set(days.map((day) => DAY_NAMES.indexOf(day)))]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (indexes.length === 0) return '';

  const labels: string[] = [];
  let start = indexes[0];
  let previous = indexes[0];

  for (let index = 1; index <= indexes.length; index += 1) {
    const current = indexes[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    labels.push(start === previous ? shortDay(start) : `${shortDay(start)}-${shortDay(previous)}`);
    start = current;
    previous = current;
  }

  return labels.join(', ');
}

/** "Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 5:00 PM" (timezone added by the caller). */
export function formatBusinessHours(specs: OpeningHoursSpec[]): string {
  return specs
    .map((spec) => {
      const days = formatDays(spec.dayOfWeek);
      return days ? `${days}: ${to12Hour(spec.opens)} - ${to12Hour(spec.closes)}` : '';
    })
    .filter(Boolean)
    .join(', ');
}

export const DEFAULT_OPENING_HOURS: OpeningHoursSpec[] = parseBusinessHours(DEFAULT_BUSINESS_HOURS_TEXT);

/** Used by the surfaces that render a fixed line (footer, policy pages). */
