import { defineType, defineArrayMember } from 'sanity';

/** Reusable portable-text array with inline images. */
export const blockContent = defineType({
  name: 'blockContent',
  title: 'Sadržaj',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normalno', value: 'normal' },
        { title: 'Naslov 2', value: 'h2' },
        { title: 'Naslov 3', value: 'h3' },
        { title: 'Citat', value: 'blockquote' },
      ],
      lists: [
        { title: 'Lista', value: 'bullet' },
        { title: 'Numerirano', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Podebljano', value: 'strong' },
          { title: 'Kurziv', value: 'em' },
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Poveznica',
            fields: [
              { name: 'href', type: 'url', title: 'URL', validation: (r) => r.uri({ scheme: ['http', 'https', 'mailto', 'tel'] }) },
            ],
          },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt tekst' }],
    }),
  ],
});
