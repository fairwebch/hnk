export const metadata = {
  title: 'HNK Kroatien Schwyz · Studio',
  robots: { index: false, follow: false },
};

// The embedded Sanity Studio provides its own full-page UI/styles.
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
