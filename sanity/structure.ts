import type { StructureResolver } from 'sanity/structure';

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Sadržaj')
    .items([
      S.documentTypeListItem('novost').title('Novosti'),
      S.documentTypeListItem('dogadjaj').title('Događaji'),
      S.documentTypeListItem('galerija').title('Galerije'),
      S.divider(),
      S.documentTypeListItem('momcad').title('Momčadi'),
      S.documentTypeListItem('clanUprave').title('Uprava'),
      S.documentTypeListItem('sponzor').title('Sponzori'),
      S.divider(),
      S.documentTypeListItem('stranica').title('Stranice'),
    ]);
