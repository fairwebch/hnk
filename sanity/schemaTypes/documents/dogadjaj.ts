import { defineType, defineField, defineArrayMember } from 'sanity';

/** Random member-access code for "samo članovi" registration links. */
const generateTajniKod = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export const dogadjaj = defineType({
  name: 'dogadjaj',
  title: 'Događaj',
  type: 'document',
  groups: [
    { name: 'sadrzaj', title: 'Sadržaj', default: true },
    { name: 'prijave', title: 'Prijave' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Naziv',
      type: 'localeString',
      validation: (r) => r.required(),
      group: 'sadrzaj',
    }),
    defineField({
      name: 'slug',
      group: 'sadrzaj',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name.hr', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'kategorija',
      group: 'sadrzaj',
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
      group: 'sadrzaj',
      title: 'Datum početka',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'datumKraj',
      group: 'sadrzaj',
      title: 'Datum kraja (opciono)',
      type: 'datetime',
      description: 'Ako nije unesen, koristi se datum početka.',
    }),
    defineField({
      name: 'location',
      group: 'sadrzaj',
      title: 'Lokacija',
      type: 'string',
    }),
    defineField({
      name: 'coverImage',
      group: 'sadrzaj',
      title: 'Naslovna slika',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt tekst' }],
    }),
    defineField({
      name: 'description',
      group: 'sadrzaj',
      title: 'Opis',
      type: 'localeBlockContent',
    }),
    defineField({
      name: 'kotizacija',
      group: 'sadrzaj',
      title: 'Kotizacija / cijena',
      type: 'string',
      description: 'Npr. „Besplatno", „20 CHF po ekipi".',
    }),
    defineField({
      name: 'prijavaLink',
      group: 'sadrzaj',
      title: 'Link za prijavu',
      type: 'url',
      validation: (r) => r.uri({ scheme: ['http', 'https', 'mailto', 'tel'] }),
    }),
    defineField({
      name: 'kapacitet',
      group: 'sadrzaj',
      title: 'Kapacitet',
      type: 'string',
      description: 'Npr. „16 ekipa", „200 mjesta".',
    }),
    defineField({
      name: 'program',
      group: 'sadrzaj',
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
      group: 'sadrzaj',
      title: 'Sponzor događaja',
      type: 'reference',
      to: [{ type: 'sponzor' }],
    }),
    defineField({
      name: 'galerija',
      title: 'Povezana galerija (arhiva)',
      type: 'reference',
      to: [{ type: 'galerija' }],
      group: 'sadrzaj',
    }),

    // ---- Prijave (event-registration settings) ----
    defineField({
      name: 'vrstaPrijave',
      title: 'Vrsta prijave',
      type: 'string',
      group: 'prijave',
      options: {
        list: [
          { title: 'Bez prijava', value: 'bez' },
          { title: 'Prijava osobe', value: 'osoba' },
          { title: 'Prijava ekipe', value: 'ekipa' },
        ],
        layout: 'radio',
      },
      initialValue: 'bez',
      description: 'Određuje koja se forma prikazuje na stranici događaja.',
    }),
    defineField({
      name: 'pristupPrijavi',
      title: 'Pristup prijavi',
      type: 'string',
      group: 'prijave',
      options: {
        list: [
          { title: 'Javna — svatko se može prijaviti', value: 'javna' },
          { title: 'Samo članovi — treba tajni link', value: 'clanovi' },
        ],
        layout: 'radio',
      },
      initialValue: 'javna',
      hidden: ({ parent }) => !parent?.vrstaPrijave || parent.vrstaPrijave === 'bez',
    }),
    defineField({
      name: 'prijaveOtvorene',
      title: 'Prijave otvorene',
      type: 'boolean',
      group: 'prijave',
      initialValue: false,
      hidden: ({ parent }) => !parent?.vrstaPrijave || parent.vrstaPrijave === 'bez',
    }),
    defineField({
      name: 'rokPrijave',
      title: 'Rok prijave (opciono)',
      type: 'datetime',
      group: 'prijave',
      description: 'Nakon isteka roka forma se automatski zatvara.',
      hidden: ({ parent }) => !parent?.vrstaPrijave || parent.vrstaPrijave === 'bez',
    }),
    defineField({
      name: 'tajniKod',
      title: 'Tajni kod (za „samo članovi“)',
      type: 'string',
      group: 'prijave',
      initialValue: generateTajniKod,
      description:
        'Članski link: /dogadjaji/<slug>?kod=<tajni kod>. Podijeli ga preko newslettera — forma je vidljiva samo s ispravnim kodom.',
      hidden: ({ parent }) => parent?.pristupPrijavi !== 'clanovi' || !parent?.vrstaPrijave || parent.vrstaPrijave === 'bez',
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
