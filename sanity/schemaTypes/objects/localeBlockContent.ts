import { defineType, defineField } from 'sanity';
import { languages, baseLanguage } from '../languages';

export const localeBlockContent = defineType({
  name: 'localeBlockContent',
  title: 'Lokalizirani sadržaj',
  type: 'object',
  fieldsets: [{ name: 'translations', title: 'Prijevodi (DE)', options: { collapsible: true, collapsed: false } }],
  fields: languages.map((lang) =>
    defineField({
      name: lang.id,
      title: lang.title,
      type: 'blockContent',
      fieldset: lang.id === baseLanguage.id ? undefined : 'translations',
    }),
  ),
});
