import { client } from './client';
import { sanityConfigured } from '../env';

/**
 * Safe GROQ fetch. Returns `fallback` when Sanity isn't configured yet or a
 * request fails, so every page renders its empty state instead of crashing.
 * Revalidates on a 60s ISR window.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T,
): Promise<T> {
  if (!sanityConfigured) return fallback;
  try {
    return await client.fetch<T>(query, params, {
      next: { revalidate: 60 },
    });
  } catch (err) {
    console.error('[sanityFetch] failed:', (err as Error).message);
    return fallback;
  }
}
