import type { APIResponse, SocialMediaSettings } from '@/types';

export async function getPublicSocialMediaSettings(): Promise<SocialMediaSettings | null> {
  const backendUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

  try {
    const response = await fetch(`${backendUrl}/api/v1/public/social-media`, {
      next: { revalidate: 300, tags: ['social-media'] },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as APIResponse<SocialMediaSettings>;
    return payload.success && payload.data ? payload.data : null;
  } catch {
    return null;
  }
}
