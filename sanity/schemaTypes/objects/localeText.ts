import { defineType, defineField } from 'sanity';
import { languages, baseLanguage } from '../languages';

export const localeText = defineType({
  name: 'localeText',
  title: 'Lokalizirani tekst (dulji)',
  type: 'object',
  fieldsets: [{ name: 'translations', title: 'Prijevodi', options: { collapsible: true } }],
  fields: languages.map((lang) =>
    defineField({
      name: lang.id,
      title: lang.title,
      type: 'text',
      rows: 3,
      fieldset: lang.id === baseLanguage.id ? undefined : 'translations',
    }),
  ),
});
