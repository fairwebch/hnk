import { type SchemaTypeDefinition } from 'sanity';

import { localeString } from './objects/localeString';
import { localeText } from './objects/localeText';
import { blockContent } from './objects/blockContent';
import { localeBlockContent } from './objects/localeBlockContent';

import { novost } from './documents/novost';
import { clanUprave } from './documents/clanUprave';
import { momcad } from './documents/momcad';
import { sponzor } from './documents/sponzor';
import { galerija } from './documents/galerija';
import { dogadjaj } from './documents/dogadjaj';
import { stranica } from './documents/stranica';
import { klubStranica } from './documents/klubStranica';

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // objects
    localeString,
    localeText,
    blockContent,
    localeBlockContent,
    // documents
    novost,
    clanUprave,
    momcad,
    sponzor,
    galerija,
    dogadjaj,
    stranica,
    klubStranica,
  ],
};
