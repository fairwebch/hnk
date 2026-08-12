import { defineType, defineField } from 'sanity';

export const momcad = defineType({
  name: 'momcad',
  title: 'Momčad',
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
      name: 'order',
      title: 'Redoslijed',
      type: 'number',
      initialValue: 100,
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
      name: 'gallery',
      title: 'Galerija slika',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', type: 'string', title: 'Alt tekst' }],
        },
      ],
      options: { layout: 'grid' },
    }),
  ],
  orderings: [
    { title: 'Redoslijed', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name.hr', media: 'coverImage' },
  },
});
