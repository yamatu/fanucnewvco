import type { APIResponse, SocialMediaSettings } from '@/types';

export async function getPublicSocialMediaSettings(options?: { fresh?: boolean }): Promise<SocialMediaSettings | null> {
  const backendUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const endpoint = `${backendUrl}/api/v1/public/social-media`;
    const response = options?.fresh
      ? await fetch(endpoint, { cache: 'no-store', signal: controller.signal })
      : await fetch(endpoint, { next: { revalidate: 300, tags: ['social-media'] }, signal: controller.signal });
    if (!response.ok) return null;

    const payload = (await response.json()) as APIResponse<SocialMediaSettings>;
    return payload.success && payload.data ? payload.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
