import { defineType, defineField } from 'sanity';

export const novost = defineType({
  name: 'novost',
  title: 'Novost',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Naslov',
      type: 'localeString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title.hr', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'date',
      title: 'Datum',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'category',
      title: 'Kategorija',
      type: 'string',
      options: {
        list: [
          { title: 'Eventi', value: 'Eventi' },
          { title: 'Novosti', value: 'Novosti' },
          { title: 'Skupština', value: 'Skupština' },
          { title: 'Sport', value: 'Sport' },
        ],
        layout: 'radio',
      },
      initialValue: 'Novosti',
    }),
    defineField({
      name: 'coverImage',
      title: 'Naslovna slika',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt tekst' }],
    }),
    defineField({
      name: 'excerpt',
      title: 'Kratak opis',
      type: 'localeText',
    }),
    defineField({
      name: 'body',
      title: 'Sadržaj',
      type: 'localeBlockContent',
    }),
  ],
  orderings: [
    {
      title: 'Datum, najnovije',
      name: 'dateDesc',
      by: [{ field: 'date', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title.hr', subtitle: 'category', media: 'coverImage' },
  },
});
