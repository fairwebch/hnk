import { defineType, defineField, defineArrayMember } from 'sanity';

/** Singleton: "Naša priča" content for the /klub page (intro + timeline). */
export const klubStranica = defineType({
  name: 'klubStranica',
  title: 'Klub — naša priča',
  type: 'document',
  fields: [
    defineField({
      name: 'uvod',
      title: 'Uvodni tekst',
      type: 'localeBlockContent',
    }),
    defineField({
      name: 'timeline',
      title: 'Timeline',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stavka',
          title: 'Stavka',
          fields: [
            defineField({
              name: 'godina',
              title: 'Godina (za sortiranje)',
              type: 'number',
              validation: (r) => r.required().integer().min(1900).max(2100),
            }),
            defineField({
              name: 'godinaLabela',
              title: 'Prikazana godina (opciono)',
              description: 'Npr. "Kasne 1990-e" ili "Danas" — ako je prazno, prikazuje se broj.',
              type: 'localeString',
            }),
            defineField({
              name: 'naslov',
              title: 'Naslov',
              type: 'localeString',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'tekst',
              title: 'Tekst',
              type: 'localeText',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'slika',
              title: 'Slika (opciono)',
              type: 'image',
              options: { hotspot: true },
            }),
          ],
          preview: {
            select: { title: 'naslov.hr', godina: 'godina', labela: 'godinaLabela.hr', media: 'slika' },
            prepare({ title, godina, labela, media }) {
              return { title: `${labela || godina} — ${title}`, media };
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'zavrsniTekst',
      title: 'Završni tekst (opciono)',
      type: 'localeBlockContent',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Klub — naša priča' }),
  },
});
