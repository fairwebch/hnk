import { defineType, defineField } from 'sanity';

export const sponzor = defineType({
  name: 'sponzor',
  title: 'Sponzor',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Naziv',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: false },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'package',
      title: 'Paket',
      type: 'string',
      options: {
        list: [
          { title: 'Basic', value: 'Basic' },
          { title: 'Standard', value: 'Standard' },
          { title: 'Premium', value: 'Premium' },
        ],
        layout: 'radio',
      },
      initialValue: 'Basic',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'link',
      title: 'Web poveznica',
      type: 'url',
      validation: (r) => r.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'packageDescription',
      title: 'Opis paketa',
      type: 'localeText',
    }),
    defineField({
      name: 'order',
      title: 'Redoslijed',
      type: 'number',
      initialValue: 100,
    }),
  ],
  orderings: [
    { title: 'Redoslijed', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'package', media: 'logo' },
  },
});
