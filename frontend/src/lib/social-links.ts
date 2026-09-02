export interface SocialLinksPublicConfig {
  show_in_footer: boolean;
  x_url: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
}

export interface SocialLinkSetting extends SocialLinksPublicConfig {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export type UpdateSocialLinkSettingRequest = SocialLinksPublicConfig;

export function getConfiguredSocialURLs(config?: SocialLinksPublicConfig | null): string[] {
  if (!config) return [];

  return [config.x_url, config.facebook_url, config.instagram_url, config.linkedin_url]
    .map((url) => url.trim())
    .filter(Boolean);
}
