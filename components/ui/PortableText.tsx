import Image from 'next/image';
import {
  PortableText as BasePortableText,
  type PortableTextComponents,
} from '@portabletext/react';
import type { PortableTextBlock } from 'sanity';
import { urlFor } from '@/sanity/lib/image';

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="font-sans text-slateblue-100 leading-relaxed my-4">{children}</p>
    ),
    h2: ({ children }) => (
      <h2 className="font-display font-bold text-white uppercase tracking-[.03em] text-2xl md:text-3xl mt-10 mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-display font-bold text-white uppercase tracking-[.03em] text-xl mt-8 mb-2">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-croatia pl-5 my-6 italic text-slateblue-50">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 my-4 space-y-1 text-slateblue-100 marker:text-croatia">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 my-4 space-y-1 text-slateblue-100 marker:text-croatia">{children}</ol>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-royal-light underline underline-offset-2 hover:text-white transition-colors"
      >
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }) =>
      value?.asset ? (
        <figure className="my-8">
          <Image
            src={urlFor(value).width(1200).fit('max').auto('format').url()}
            alt={value.alt || ''}
            width={1200}
            height={800}
            className="w-full h-auto rounded-lg border border-slateblue-900"
          />
          {value.alt && (
            <figcaption className="text-sm text-slateblue-400 mt-2">{value.alt}</figcaption>
          )}
        </figure>
      ) : null,
  },
};

export function PortableText({ value }: { value?: PortableTextBlock[] }) {
  if (!value || value.length === 0) return null;
  return (
    <div className="max-w-none">
      <BasePortableText value={value} components={components} />
    </div>
  );
}
