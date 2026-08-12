import { defineType, defineField } from 'sanity';

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
      name: 'date',
      title: 'Datum i vrijeme',
      type: 'datetime',
      validation: (r) => r.required(),
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
  ],
  orderings: [
    { title: 'Datum, nadolazeće', name: 'dateAsc', by: [{ field: 'date', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name.hr', subtitle: 'date', media: 'coverImage' },
  },
});
