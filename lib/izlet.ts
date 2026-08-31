/** One-off Europapark check-in tool — shared constants and types.
 *  Data lives in the PRIVATE `prijave` dataset, never in public `production`. */

export type IzletKategorija = 'odrasli' | 'mladi' | 'djeca';
export type IzletPrijevoz = 'bus' | 'privat';

export interface IzletPutnik {
  _id: string;
  ime: string;
  kategorija: IzletKategorija;
  prijevoz: IzletPrijevoz;
  placeno: boolean;
  dosao: boolean;
}

/** CHF per person; children ride free. */
export const CJENIK: Record<IzletKategorija, number> = {
  odrasli: 50,
  mladi: 30,
  djeca: 0,
};

export const KATEGORIJA_LABEL: Record<IzletKategorija, string> = {
  odrasli: 'Odrasli',
  mladi: 'Mladi 12–18',
  djeca: 'Djeca do 12',
};

export const PRIJEVOZ_LABEL: Record<IzletPrijevoz, string> = {
  bus: 'Bus',
  privat: 'Privat',
};
