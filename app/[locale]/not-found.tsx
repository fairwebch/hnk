import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <section className="bg-ink-700">
      <div className="container-x py-24 md:py-32 text-center">
        <div className="font-display font-extrabold text-croatia text-7xl md:text-9xl leading-none">404</div>
        <h1 className="font-display font-bold text-white uppercase text-2xl md:text-3xl mt-4 tracking-[.03em]">
          {t('title')}
        </h1>
        <p className="font-sans text-slateblue-300 mt-3 max-w-md mx-auto">{t('subtitle')}</p>
        <Link href="/" className="btn-cta mt-8 px-6 py-3.5">
          <span>{t('home')}</span>
        </Link>
      </div>
    </section>
  );
}
