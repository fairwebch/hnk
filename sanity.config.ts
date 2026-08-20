'use client';

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { apiVersion, dataset, projectId } from './sanity/env';
import { schema } from './sanity/schemaTypes';
import { structure } from './sanity/structure';

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
  document: {
    // Registrations are created only through the public form / API route.
    newDocumentOptions: (prev) =>
      prev.filter((t) => !['prijavaOsoba', 'prijavaEkipa'].includes(t.templateId)),
  },
  title: 'HNK Kroatien Schwyz',
});
