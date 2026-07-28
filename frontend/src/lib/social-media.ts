import type { SocialMediaSettings } from '@/types';

export type SocialMediaURLKey =
  | 'x_url'
  | 'facebook_url'
  | 'instagram_url'
  | 'linkedin_url';

export const SOCIAL_MEDIA_URL_KEYS: SocialMediaURLKey[] = [
  'x_url',
  'facebook_url',
  'instagram_url',
  'linkedin_url',
];

export function getSocialMediaURLs(settings?: SocialMediaSettings | null): string[] {
  if (!settings) return [];

  return [...new Set(
    SOCIAL_MEDIA_URL_KEYS
      .map((key) => String(settings[key] || '').trim())
      .filter((value) => /^https?:\/\//i.test(value)),
  )];
}
