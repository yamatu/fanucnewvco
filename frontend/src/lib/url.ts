export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  // If env URL is present and not localhost, ensure it has protocol
  if (envUrl && !/^(localhost|127\.0\.0\.1)/i.test(envUrl)) {
    return /^(http:\/\/|https:\/\/)/i.test(envUrl) ? envUrl : `https://${envUrl}`;
  }
  // Fallback to production domain (with protocol)
  return 'https://www.vcocncspare.com';
}
