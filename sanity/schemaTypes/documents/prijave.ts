import { defineType, defineField } from 'sanity';

/**
 * Event-registration documents. Created ONLY by the /api/prijava route —
 * every field except `statusPlacanja` is read-only in the Studio so the
 * visitor-submitted data can't be edited by accident. Payment status is
 * toggled from the Prijave dashboard (or here).
 */

const RO = true; // read-only marker, applied per field (not statusPlacanja)

const zajednickaPolja = [
  defineField({
    name: 'dogadjaj',
    title: 'Događaj',
    type: 'reference',
    to: [{ type: 'dogadjaj' }],
    readOnly: RO,
    validation: (r) => r.required(),
  }),
  defineField({
    name: 'statusPlacanja',
    title: 'Status plaćanja',
    type: 'string',
    options: {
      list: [
        { title: 'Neplaćeno', value: 'neplaceno' },
        { title: 'Plaćeno', value: 'placeno' },
      ],
      layout: 'radio',
    },
    initialValue: 'neplaceno',
  }),
  defineField({ name: 'datumPrijave', title: 'Datum prijave', type: 'datetime', readOnly: RO }),
  defineField({ name: 'otkazana', title: 'Otkazana', type: 'boolean', initialValue: false, readOnly: RO }),
  defineField({ name: 'datumOtkaza', title: 'Datum otkaza', type: 'datetime', readOnly: RO }),
  defineField({
    name: 'otkazniToken',
    title: 'Token za otkazivanje',
    type: 'string',
    readOnly: RO,
    hidden: true,
  }),
];

export const prijavaOsoba = defineType({
  name: 'prijavaOsoba',
  title: 'Prijava — osoba',
  type: 'document',
  // No manual creation: registrations come in through the public form.
  __experimental_omnisearch_visibility: false,
  fields: [
    defineField({ name: 'ime', title: 'Ime', type: 'string', readOnly: RO }),
    defineField({ name: 'prezime', title: 'Prezime', type: 'string', readOnly: RO }),
    defineField({ name: 'email', title: 'E-mail', type: 'string', readOnly: RO }),
    defineField({ name: 'telefon', title: 'Telefon', type: 'string', readOnly: RO }),
    defineField({ name: 'brojOsoba', title: 'Broj osoba', type: 'number', initialValue: 1, readOnly: RO }),
    defineField({ name: 'napomena', title: 'Napomena', type: 'text', rows: 3, readOnly: RO }),
    ...zajednickaPolja,
  ],
  preview: {
    select: { ime: 'ime', prezime: 'prezime', broj: 'brojOsoba', status: 'statusPlacanja', otkazana: 'otkazana', datum: 'datumPrijave' },
    prepare: ({ ime, prezime, broj, status, otkazana, datum }) => ({
      title: `${ime ?? ''} ${prezime ?? ''}${broj > 1 ? ` (${broj} os.)` : ''}`,
      subtitle: [
        otkazana ? 'OTKAZANA' : status === 'placeno' ? 'Plaćeno' : 'Neplaćeno',
        datum ? new Date(datum).toLocaleDateString('hr') : null,
      ].filter(Boolean).join(' · '),
    }),
  },
});

export const prijavaEkipa = defineType({
  name: 'prijavaEkipa',
  title: 'Prijava — ekipa',
  type: 'document',
  __experimental_omnisearch_visibility: false,
  fields: [
    defineField({ name: 'nazivEkipe', title: 'Naziv ekipe', type: 'string', readOnly: RO }),
    defineField({ name: 'kontaktOsoba', title: 'Kontakt osoba', type: 'string', readOnly: RO }),
    defineField({ name: 'email', title: 'E-mail', type: 'string', readOnly: RO }),
    defineField({ name: 'telefon', title: 'Telefon', type: 'string', readOnly: RO }),
    ...zajednickaPolja,
  ],
  preview: {
    select: { naziv: 'nazivEkipe', kontakt: 'kontaktOsoba', status: 'statusPlacanja', otkazana: 'otkazana', datum: 'datumPrijave' },
    prepare: ({ naziv, kontakt, status, otkazana, datum }) => ({
      title: naziv ?? kontakt ?? 'Ekipa',
      subtitle: [
        otkazana ? 'OTKAZANA' : status === 'placeno' ? 'Plaćeno' : 'Neplaćeno',
        datum ? new Date(datum).toLocaleDateString('hr') : null,
      ].filter(Boolean).join(' · '),
    }),
  },
});
