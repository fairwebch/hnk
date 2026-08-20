import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '../env';

/**
 * SERVER-ONLY Sanity client with write access. The token comes from the
 * SANITY_WRITE_TOKEN env var (no NEXT_PUBLIC_ prefix, so it can never end up
 * in the client bundle). Import this ONLY from API routes / server code.
 */
export const serverClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
  perspective: 'published',
});

export const serverClientConfigured = Boolean(process.env.SANITY_WRITE_TOKEN);
