import { defineType, defineField } from 'sanity';

/** Static CMS-driven page: O nama, Klub, Postani član, Kontakt, Impressum, Datenschutz. */
export const stranica = defineType({
  name: 'stranica',
  title: 'Stranica',
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
      description:
        'Mora odgovarati ruti: o-nama, klub, postani-clan, kontakt, impressum, datenschutzerklarung.',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Uvodni tekst',
      type: 'localeText',
    }),
    defineField({
      name: 'body',
      title: 'Sadržaj',
      type: 'localeBlockContent',
    }),
  ],
  preview: {
    select: { title: 'title.hr', subtitle: 'slug.current' },
  },
});
