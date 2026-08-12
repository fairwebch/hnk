import { defineType, defineField } from 'sanity';

export const clanUprave = defineType({
  name: 'clanUprave',
  title: 'Član uprave',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Ime i prezime',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'role',
      title: 'Funkcija',
      type: 'localeString',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'phone',
      title: 'Telefon',
      type: 'string',
    }),
    defineField({
      name: 'image',
      title: 'Slika',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'order',
      title: 'Redoslijed',
      type: 'number',
      description: 'Niži broj = viši na listi.',
      initialValue: 100,
      validation: (r) => r.required(),
    }),
  ],
  orderings: [
    { title: 'Redoslijed', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'role.hr', media: 'image' },
  },
});
