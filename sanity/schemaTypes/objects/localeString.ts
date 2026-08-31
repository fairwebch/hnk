import { defineType, defineField } from 'sanity';
import { languages, baseLanguage } from '../languages';

export const localeString = defineType({
  name: 'localeString',
  title: 'Lokalizirani tekst',
  type: 'object',
  fieldsets: [{ name: 'translations', title: 'Prijevodi', options: { collapsible: true } }],
  fields: languages.map((lang) =>
    defineField({
      name: lang.id,
      title: lang.title,
      type: 'string',
      fieldset: lang.id === baseLanguage.id ? undefined : 'translations',
    }),
  ),
});
