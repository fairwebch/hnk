import Link from 'next/link';

// Global fallback 404 (outside any locale). Self-contained because the root
// layout is a passthrough — the localized 404 lives at app/[locale]/not-found.tsx.
export default function GlobalNotFound() {
  return (
    <html lang="hr">
      <body style={{ margin: 0, background: '#0A1428', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 800, color: '#D8232F' }}>404</div>
          <p style={{ color: '#93A0BA', marginTop: 8 }}>Stranica nije pronađena · Seite nicht gefunden</p>
          <Link href="/hr" style={{ color: '#fff', marginTop: 24, textDecoration: 'underline' }}>
            HNK Kroatien Schwyz
          </Link>
        </div>
      </body>
    </html>
  );
}
