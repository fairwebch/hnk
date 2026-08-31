import { defineType, defineField, defineArrayMember } from 'sanity';

export const POZICIJE = [
  { title: 'Golman', value: 'golman' },
  { title: 'Obrana', value: 'obrana' },
  { title: 'Vezni red', value: 'vezni' },
  { title: 'Napad', value: 'napad' },
];

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
      name: 'grupnaFotografija',
      title: 'Grupna fotografija',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt tekst' }],
    }),
    defineField({
      name: 'popisImena',
      title: 'Popis imena (po redovima na fotografiji)',
      description: 'Prikazuje se dok roster igrača nije popunjen.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'redImena',
          title: 'Red',
          fields: [
            defineField({ name: 'oznakaReda', title: 'Oznaka reda', type: 'localeString' }),
            defineField({ name: 'imena', title: 'Imena (odvojena zarezom)', type: 'string' }),
          ],
          preview: {
            select: { title: 'oznakaReda.hr', subtitle: 'imena' },
          },
        }),
      ],
    }),
    defineField({
      name: 'igraci',
      title: 'Igrači (roster)',
      description: 'Kad se popuni, stranica momčadi automatski prelazi na roster prikaz.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'igrac',
          title: 'Igrač',
          fields: [
            defineField({ name: 'ime', title: 'Ime', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'prezime', title: 'Prezime (opciono)', type: 'string' }),
            defineField({ name: 'broj', title: 'Broj dresa (opciono)', type: 'number' }),
            defineField({
              name: 'pozicija',
              title: 'Pozicija (opciono)',
              type: 'string',
              options: { list: POZICIJE },
            }),
            defineField({ name: 'slika', title: 'Slika (opciono)', type: 'image', options: { hotspot: true } }),
          ],
          preview: {
            select: { title: 'ime', prezime: 'prezime', broj: 'broj', media: 'slika' },
            prepare({ title, prezime, broj, media }) {
              return { title: [title, prezime].filter(Boolean).join(' '), subtitle: broj ? `#${broj}` : undefined, media };
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'trener',
      title: 'Trener (opciono)',
      type: 'object',
      fields: [
        defineField({ name: 'ime', title: 'Ime i prezime', type: 'string' }),
        defineField({ name: 'funkcija', title: 'Funkcija', type: 'localeString' }),
        defineField({ name: 'slika', title: 'Slika', type: 'image', options: { hotspot: true } }),
      ],
    }),
    defineField({
      name: 'liga',
      title: 'Liga / natjecanje (opciono)',
      type: 'localeString',
    }),
    defineField({
      name: 'terminTreninga',
      title: 'Termin treninga (opciono)',
      type: 'localeString',
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
