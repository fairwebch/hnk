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
    defineField({
      name: 'headerPostaniClan',
      title: 'Header fotografija — Postani član',
      type: 'image',
      options: { hotspot: true },
      description: 'Pozadina naslova stranice /postani-clan. Prazno = tamni header bez fotografije.',
    }),
    defineField({
      name: 'headerKlub',
      title: 'Header fotografija — Klub',
      type: 'image',
      options: { hotspot: true },
      description: 'Pozadina naslova stranice /klub. Prazno = tamni header bez fotografije.',
    }),
    defineField({
      name: 'headerSponzoring',
      title: 'Header fotografija — Sponzoring',
      type: 'image',
      options: { hotspot: true },
      description: 'Pozadina naslova stranice /sponzoring. Prazno = tamni header bez fotografije.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Postavke sajta' }) },
});
