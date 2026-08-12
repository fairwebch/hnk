export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-10-01';

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

// Falls back to a harmless placeholder so the app builds & renders empty
// states before the real Sanity project is created. Replaced via .env.local.
export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'placeholder';

/** True once a real Sanity project id has been configured. */
export const sanityConfigured = projectId !== 'placeholder';
