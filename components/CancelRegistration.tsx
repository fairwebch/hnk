'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card } from '@/components/ui/Card';

type Status = 'idle' | 'sending' | 'ok' | 'already' | 'notFound' | 'error';

/** Cancellation flow behind an explicit confirm button, so e-mail link
 *  scanners can't cancel a registration by just fetching the URL. */
export function CancelRegistration() {
  return (
    <Suspense fallback={null}>
      <CancelInner />
    </Suspense>
  );
}

function CancelInner() {
  const t = useTranslations('prijava');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('idle');
  const [dogadjaj, setDogadjaj] = useState('');

  async function cancel() {
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/otkazi-prijavu', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const d = await res.json();
        setDogadjaj(d?.dogadjaj ?? '');
        setStatus(d?.already ? 'already' : 'ok');
      } else if (res.status === 404) {
        setStatus('notFound');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (!token) {
    return <Notice title={t('otkaziNemaTokena')} text={t('otkaziNemaTokenaTekst')} />;
  }

  if (status === 'ok' || status === 'already') {
    return (
      <Card className="border-l-4 border-l-croatia px-6 py-8">
        <p className="font-display font-bold uppercase text-sm tracking-wider2 text-croatia mb-2">
          ✓ {status === 'already' ? t('otkaziVec') : t('otkaziUspjeh')}
        </p>
        <p className="font-sans text-content-soft">
          {dogadjaj ? t('otkaziUspjehTekst', { dogadjaj }) : t('otkaziUspjehTekstBez')}
        </p>
        <Link href="/dogadjaji" className="btn-ghost-light mt-6 inline-flex px-5 py-2.5 text-xs">
          {t('natragNaDogadjaje')}
        </Link>
      </Card>
    );
  }

  if (status === 'notFound') {
    return <Notice title={t('otkaziNijePronadjena')} text={t('otkaziNijePronadjenaTekst')} />;
  }

  return (
    <Card className="px-6 py-8">
      <p className="font-sans text-content-soft mb-6">{t('otkaziPotvrdaTekst')}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={cancel}
          disabled={status === 'sending'}
          className="btn-cta px-6 py-3.5 disabled:opacity-70"
        >
          <span>{status === 'sending' ? t('otkazujem') : t('otkaziPotvrdi')}</span>
        </button>
        {status === 'error' && (
          <span className="font-display font-bold uppercase text-xs tracking-wider2 text-content-muted">{t('greska')}</span>
        )}
      </div>
    </Card>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="card-dashed px-6 py-8">
      <p className="font-display font-bold uppercase text-sm tracking-wider2 text-content mb-2">{title}</p>
      <p className="font-sans text-content-soft">{text}</p>
    </div>
  );
}
