import { defineType, defineField, defineArrayMember } from 'sanity';

export const dogadjaj = defineType({
  name: 'dogadjaj',
  title: 'Događaj',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Naziv',
      type: 'localeString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name.hr', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'kategorija',
      title: 'Kategorija',
      type: 'string',
      options: {
        list: [
          { title: 'Turnir', value: 'Turnir' },
          { title: 'Zabava', value: 'Zabava' },
          { title: 'Izlet', value: 'Izlet' },
          { title: 'Skupština', value: 'Skupština' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'datumPocetak',
      title: 'Datum početka',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'datumKraj',
      title: 'Datum kraja (opciono)',
      type: 'datetime',
      description: 'Ako nije unesen, koristi se datum početka.',
    }),
    defineField({
      name: 'location',
      title: 'Lokacija',
      type: 'string',
    }),
    defineField({
      name: 'coverImage',
      title: 'Naslovna slika',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt tekst' }],
    }),
    defineField({
      name: 'description',
      title: 'Opis',
      type: 'localeBlockContent',
    }),
    defineField({
      name: 'kotizacija',
      title: 'Kotizacija / cijena',
      type: 'string',
      description: 'Npr. „Besplatno", „20 CHF po ekipi".',
    }),
    defineField({
      name: 'prijavaLink',
      title: 'Link za prijavu',
      type: 'url',
      validation: (r) => r.uri({ scheme: ['http', 'https', 'mailto', 'tel'] }),
    }),
    defineField({
      name: 'kapacitet',
      title: 'Kapacitet',
      type: 'string',
      description: 'Npr. „16 ekipa", „200 mjesta".',
    }),
    defineField({
      name: 'program',
      title: 'Program dana',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'programStavka',
          title: 'Stavka programa',
          fields: [
            { name: 'vrijeme', title: 'Vrijeme', type: 'string' },
            { name: 'opis', title: 'Opis', type: 'string' },
          ],
          preview: { select: { title: 'vrijeme', subtitle: 'opis' } },
        }),
      ],
    }),
    defineField({
      name: 'sponzorEventa',
      title: 'Sponzor događaja',
      type: 'reference',
      to: [{ type: 'sponzor' }],
    }),
    defineField({
      name: 'galerija',
      title: 'Povezana galerija (arhiva)',
      type: 'reference',
      to: [{ type: 'galerija' }],
    }),
  ],
  orderings: [
    { title: 'Datum, nadolazeće', name: 'dateAsc', by: [{ field: 'datumPocetak', direction: 'asc' }] },
    { title: 'Datum, najnovije', name: 'dateDesc', by: [{ field: 'datumPocetak', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'name.hr', subtitle: 'datumPocetak', media: 'coverImage', kat: 'kategorija' },
    prepare: ({ title, subtitle, media, kat }) => ({
      title,
      subtitle: [kat, subtitle ? new Date(subtitle).toLocaleDateString('hr') : null].filter(Boolean).join(' · '),
      media,
    }),
  },
});
