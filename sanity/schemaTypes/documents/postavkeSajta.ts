import { defineType, defineField } from 'sanity';

export const postavkeSajta = defineType({
  name: 'postavkeSajta',
  title: 'Postavke sajta',
  type: 'document',
  fields: [
    defineField({
      name: 'heroSlike',
      title: 'Hero fotografije (1–3)',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', type: 'string', title: 'Alt tekst' }],
        },
      ],
      validation: (r) => r.max(3),
      description:
        'Fotografije u pozadini hero sekcije na početnoj. 1 slika = statično; 2–3 slike = spori crossfade. Preporuka: široki kadar, min. 1600px širine.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Postavke sajta' }) },
});
