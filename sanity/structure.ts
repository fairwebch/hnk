import type { StructureResolver } from 'sanity/structure';
import { ClipboardIcon } from '@sanity/icons';
import { PrijaveDashboard } from './components/PrijaveDashboard';

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Sadržaj')
    .items([
      S.documentTypeListItem('novost').title('Novosti'),
      S.documentTypeListItem('dogadjaj').title('Događaji'),
      S.documentTypeListItem('galerija').title('Galerije'),
      S.divider(),
      S.listItem()
        .title('Prijave')
        .icon(ClipboardIcon)
        .child(
          S.documentTypeList('dogadjaj')
            .title('Prijave po događaju')
            .apiVersion('2024-10-01')
            .filter('_type == "dogadjaj" && defined(vrstaPrijave) && vrstaPrijave != "bez"')
            .defaultOrdering([{ field: 'datumPocetak', direction: 'desc' }])
            .child((eventId) =>
              S.component(PrijaveDashboard)
                .id(eventId)
                .title('Prijave')
                .options({ eventId }),
            ),
        ),
      S.divider(),
      S.documentTypeListItem('momcad').title('Momčadi'),
      S.documentTypeListItem('clanUprave').title('Uprava'),
      S.documentTypeListItem('sponzor').title('Sponzori'),
      S.divider(),
      S.documentTypeListItem('stranica').title('Stranice'),
    ]);
