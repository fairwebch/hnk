import { defineType, defineField } from 'sanity';

export const galerija = defineType({
  name: 'galerija',
  title: 'Galerija',
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
          { title: 'Sport i turniri', value: 'sport' },
          { title: 'Zabave i feste', value: 'feste' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'godina',
      title: 'Godina',
      type: 'number',
      description: 'Za grupisanje prikaza po godinama (npr. 2024).',
      validation: (r) => r.required().integer().min(1990).max(2100),
    }),
    defineField({
      name: 'date',
      title: 'Datum',
      type: 'date',
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),
    defineField({
      name: 'description',
      title: 'Opis',
      type: 'localeText',
    }),
    defineField({
      name: 'images',
      title: 'Slike',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', type: 'string', title: 'Alt tekst' }],
        },
      ],
      options: { layout: 'grid' },
      validation: (r) => r.min(1).error('Dodajte barem jednu sliku.'),
    }),
  ],
  orderings: [
    { title: 'Datum, najnovije', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'name.hr', godina: 'godina', kategorija: 'kategorija', media: 'images.0' },
    prepare({ title, godina, kategorija, media }) {
      const cat = kategorija === 'sport' ? 'Sport i turniri' : kategorija === 'feste' ? 'Zabave i feste' : '';
      return { title, subtitle: [godina, cat].filter(Boolean).join(' · '), media };
    },
  },
});
