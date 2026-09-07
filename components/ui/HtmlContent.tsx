/**
 * Renders pre-rendered HTML from the "stranica" PHP API (server-side
 * Markdown -> HTML, see hostpoint-cms/public/admin/includes/markdown.php).
 * The `.cms-html` rules in app/globals.css mirror components/ui/PortableText.tsx's
 * typography 1:1, so this looks the same as the Sanity Portable Text
 * rendering it replaces. The HTML is produced by our own sanitizing
 * markdown converter (never raw user input reaching the browser unescaped),
 * so dangerouslySetInnerHTML is safe here.
 */
export function HtmlContent({ html }: { html?: string }) {
  if (!html) return null;
  return <div className="cms-html max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
