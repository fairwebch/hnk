/**
 * Sponzorstvo malonogometnog turnira 2026: podaci o turniru i automatska
 * potvrda sponzoru. Bez ovisnosti (ni next, ni '@/' aliasa), pa ga dijele
 * stranica, API ruta i lokalni test potvrde.
 *
 * Potvrda sponzoru je UVIJEK na njemačkom (odluka kluba), bez obzira na jezik
 * forme, i sastavlja se iz onoga što je sponzor odabrao: obaveza donošenja i
 * postavljanja spominje se samo za banner/flyere, prijedlog samo uz "Ostalo".
 */

export const TURNIR_EVENT_SLUG = 'malonogometni-turnir-2026';
export const MIN_IZNOS_CHF = 100;
export const MAX_IZNOS_CHF = 100_000;
export const CLUB_EMAIL = 'info@kroatien-schwyz.ch';
export const CLUB_PHONE = '+41 79 279 72 32';

export type Racun = 'email' | 'post';

export interface SponzorPrijava {
  ime: string;
  prezime: string;
  firma: string;
  ulica: string;
  plz: string;
  mjesto: string;
  telefon: string;
  email: string;
  iznos: number;
  racun: Racun;
  banner: boolean;
  flyer: boolean;
  ostalo: boolean;
  prijedlog: string;
  napomena: string;
}

/** "1'250" (Swiss thousands separator), cijeli franci. */
export function formatChf(iznos: number): string {
  return `CHF ${Math.round(iznos).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}`;
}

export function potvrdaSponzoruDe(p: SponzorPrijava): { subject: string; text: string } {
  const rechnung = p.racun === 'post' ? 'per Post' : 'per E-Mail';
  const gegenleistung = [
    p.banner && 'Banner in der Halle',
    p.flyer && 'Flyer am Turnier',
    p.ostalo && `Ihr Vorschlag: «${p.prijedlog}»`,
  ].filter(Boolean) as string[];

  const angaben = [
    `Firma: ${p.firma}`,
    `Betrag: ${formatChf(p.iznos)}`,
    `Rechnung: ${rechnung}`,
    ...(gegenleistung.length ? [`Gegenleistung: ${gegenleistung.join(', ')}`] : []),
  ];

  const mitbringen = [p.banner && 'den Banner', p.flyer && 'die Flyer'].filter(Boolean) as string[];

  const absaetze = [
    `Guten Tag ${p.ime} ${p.prezime}`,
    'Vielen Dank, dass Sie unser 20. Hallenfussballturnier am 21. und 22. November 2026 in der Dreifachhalle Allmig in Oberarth unterstützen. Das schätzen wir sehr.',
    `Ihre Angaben:\n${angaben.join('\n')}`,
    ...(mitbringen.length
      ? [`Bitte bringen Sie ${mitbringen.join(' und ')} selbst mit und richten Sie alles vor Ort ein. Nach dem Turnier nehmen Sie alles wieder mit.`]
      : []),
    ...(p.ostalo ? ['Ihren Vorschlag schauen wir uns an und melden uns bei Ihnen, ob er umsetzbar ist.'] : []),
    `Die Rechnung erhalten Sie von uns ${p.racun === 'post' ? 'per Post an Ihre Firmenadresse' : 'per E-Mail'}. Bei Fragen erreichen Sie uns unter ${CLUB_EMAIL} oder ${CLUB_PHONE}.`,
    'Sportliche Grüsse\nHNK Kroatien Schwyz',
  ];

  return {
    subject: 'Ihre Unterstützung für unser 20. Hallenfussballturnier',
    text: absaetze.join('\n\n'),
  };
}
