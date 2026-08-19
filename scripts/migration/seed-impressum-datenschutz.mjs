// Seeds Impressum + Datenschutzerklärung (hr/de) into the stranica docs.
// GA section omitted (no analytics on the site); Maps section adapted to the
// link-only integration (no iframe). Run:
//   node scripts/migration/seed-impressum-datenschutz.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const TOKEN = process.env.SANITY_TOKEN || readFileSync(path.join(DIR, '.token'), 'utf8').trim();
const API = 'https://jxoy4fyb.api.sanity.io/v2024-01-01/data/mutate/production';

let k = 0;
const key = () => `k${++k}`;
const span = (text, marks = []) => ({ _type: 'span', _key: key(), text, marks });
// P(...parts): string | {b:text} bold | {a:[text, href]} link
const P = (...parts) => {
  const markDefs = [];
  const children = parts.map((p) => {
    if (typeof p === 'string') return span(p);
    if (p.b !== undefined) return span(p.b, ['strong']);
    const id = key();
    markDefs.push({ _type: 'link', _key: id, href: p.a[1] });
    return span(p.a[0], [id]);
  });
  return { _type: 'block', _key: key(), style: 'normal', markDefs, children };
};
const H3 = (t) => ({ _type: 'block', _key: key(), style: 'h3', markDefs: [], children: [span(t)] });
const LI = (t) => ({ _type: 'block', _key: key(), style: 'normal', listItem: 'bullet', level: 1, markDefs: [], children: [span(t)] });

const MAIL = { a: ['info@kroatien-schwyz.ch', 'mailto:info@kroatien-schwyz.ch'] };
const TEL = { a: ['+41 79 279 72 32', 'tel:+41792797232'] };
const GPRIV = { a: ['https://policies.google.com/privacy', 'https://policies.google.com/privacy'] };
const FAIRWEB = { a: ['Fairweb', 'https://fairweb.ch'] };

// ---------------- IMPRESSUM ----------------
const impressumDe = [
  P({ b: 'HNK Kroatien Schwyz' }, '\nVerein nach Art. 60 ff. ZGB\nMythencenterstrasse 21\n6438 Ibach\nSchweiz'),
  P({ b: 'Vertreten durch / Verantwortlich für den Inhalt:' }, '\nDanijel Ponjavić'),
  P({ b: 'Kontakt:' }, '\nE-Mail: ', MAIL, '\nTelefon: ', TEL),
  P({ b: 'UID / MWST-Nummer:' }, '\nCHE-167.667.310'),
  H3('Haftungsausschluss'),
  P('Der Verein übernimmt keinerlei Gewähr hinsichtlich der inhaltlichen Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen auf dieser Website.'),
  P('Haftungsansprüche gegen den Verein wegen Schäden materieller oder immaterieller Art, welche aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen, durch Missbrauch der Verbindung oder durch technische Störungen entstanden sind, werden ausgeschlossen.'),
  P('Alle Angebote sind unverbindlich. Der Verein behält es sich ausdrücklich vor, Teile der Seiten oder das gesamte Angebot ohne gesonderte Ankündigung zu verändern, zu ergänzen, zu löschen oder die Veröffentlichung zeitweise oder endgültig einzustellen.'),
  H3('Haftung für Links'),
  P('Verweise und Links auf Webseiten Dritter liegen ausserhalb unseres Verantwortungsbereichs. Es wird jegliche Verantwortung für solche Webseiten abgelehnt. Der Zugriff und die Nutzung solcher Webseiten erfolgen auf eigene Gefahr des Nutzers oder der Nutzerin.'),
  H3('Urheberrechte'),
  P('Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen Dateien auf dieser Website gehören ausschliesslich dem HNK Kroatien Schwyz oder den speziell genannten Rechtsinhabern. Für die Reproduktion jeglicher Elemente ist die schriftliche Zustimmung der Urheberrechtsträger im Voraus einzuholen.'),
  P('Webseite erstellt von ', FAIRWEB),
];

const impressumHr = [
  P({ b: 'HNK Kroatien Schwyz' }, '\nUdruga prema čl. 60 i dalje Švicarskog građanskog zakonika (ZGB)\nMythencenterstrasse 21\n6438 Ibach\nŠvicarska'),
  P({ b: 'Zastupa / Odgovoran za sadržaj:' }, '\nDanijel Ponjavić'),
  P({ b: 'Kontakt:' }, '\nE-mail: ', MAIL, '\nTelefon: ', TEL),
  P({ b: 'UID / PDV broj:' }, '\nCHE-167.667.310'),
  H3('Isključenje odgovornosti'),
  P('Klub ne preuzima nikakvo jamstvo u pogledu točnosti, preciznosti, aktualnosti, pouzdanosti i potpunosti informacija na ovoj web stranici.'),
  P('Isključuju se zahtjevi za naknadu štete materijalne ili nematerijalne prirode prema klubu, nastali pristupom ili korištenjem odnosno nekorištenjem objavljenih informacija, zlouporabom veze ili tehničkim smetnjama.'),
  P('Sve ponude su neobvezujuće. Klub izričito zadržava pravo izmijeniti, dopuniti ili obrisati dijelove stranica ili cjelokupnu ponudu bez posebne najave, odnosno privremeno ili trajno obustaviti objavu.'),
  H3('Odgovornost za poveznice'),
  P('Upućivanja i poveznice na web stranice trećih osoba nalaze se izvan našeg područja odgovornosti. Odbija se svaka odgovornost za takve web stranice. Pristup i korištenje takvih stranica odvija se na vlastitu odgovornost korisnika.'),
  H3('Autorska prava'),
  P('Autorska i sva ostala prava na sadržaje, slike, fotografije i druge datoteke na ovoj web stranici pripadaju isključivo HNK Kroatien Schwyz ili posebno navedenim nositeljima prava. Za reprodukciju bilo kojeg elementa potrebno je unaprijed pribaviti pisanu suglasnost nositelja autorskih prava.'),
  P('Web stranicu izradio ', FAIRWEB),
];

// ---------------- DATENSCHUTZ ----------------
// GA section dropped (site has no analytics); sections renumbered.
// Maps section adapted: the contact page only LINKS to Google Maps.
const dsDe = [
  P({ b: 'Stand:' }, ' August 2026'),
  H3('1. Verantwortliche Stelle'),
  P('HNK Kroatien Schwyz\nMythencenterstrasse 21, 6438 Ibach, Schweiz\nE-Mail: ', MAIL, '\nTelefon: ', TEL),
  P('Ansprechpartner für Datenschutzfragen: Danijel Ponjavić'),
  H3('2. Allgemeines'),
  P('Gestützt auf Art. 13 der Schweizerischen Bundesverfassung und die Bestimmungen des revidierten Bundesgesetzes über den Datenschutz (revDSG) hat jede Person Anspruch auf Schutz ihrer Privatsphäre sowie auf Schutz vor Missbrauch ihrer persönlichen Daten. Soweit Personen aus dem EU-Raum betroffen sind, richten wir uns zusätzlich nach der Datenschutz-Grundverordnung (DSGVO).'),
  P('Wir behandeln Ihre Personendaten vertraulich und entsprechend den gesetzlichen Vorschriften. Personendaten werden nur so lange aufbewahrt, wie es der Zweck der Bearbeitung erfordert oder gesetzliche Aufbewahrungspflichten es vorsehen.'),
  H3('3. Bearbeitung beim Besuch der Website'),
  P('Beim Besuch unserer Website werden durch unseren Hosting-Provider automatisch technische Daten in Server-Logfiles erfasst, die Ihr Browser übermittelt:'),
  LI('IP-Adresse'),
  LI('Datum und Uhrzeit des Zugriffs'),
  LI('aufgerufene Seite'),
  LI('Browsertyp und -version'),
  LI('Betriebssystem'),
  LI('Referrer-URL'),
  P('Diese Daten dienen ausschliesslich dem technischen Betrieb, der Sicherheit und der Fehleranalyse. Eine Zusammenführung mit anderen Datenquellen findet nicht statt.'),
  H3('4. Hosting'),
  P('Diese Website wird gehostet bei:'),
  P({ b: 'Vercel Inc.' }, ', 340 S Lemon Ave #4133, Walnut, CA 91789, USA'),
  P('Vercel bearbeitet die oben genannten Server-Logdaten in unserem Auftrag. Es kann dabei zu einer Übermittlung von Daten in die USA kommen.'),
  H3('5. Content-Management-System'),
  P('Die Inhalte dieser Website werden verwaltet mit:'),
  P({ b: 'Sanity AS' }, ', Oslo, Norwegen'),
  P('Bilder und Inhalte werden über das Content Delivery Network von Sanity ausgeliefert. Dabei wird Ihre IP-Adresse an Sanity übermittelt.'),
  H3('6. Kontaktformular'),
  P('Wenn Sie uns über das Kontaktformular schreiben, werden die von Ihnen eingegebenen Daten (Name, E-Mail-Adresse, Nachricht) zur Bearbeitung Ihrer Anfrage verwendet. Der Versand erfolgt über:'),
  P({ b: 'Resend, Inc.' }, ', USA (Serverstandort Irland)'),
  P('Wir speichern diese Daten nicht in einer Datenbank; sie werden ausschliesslich per E-Mail an uns übermittelt und in unserem Postfach aufbewahrt, solange dies zur Bearbeitung erforderlich ist.'),
  H3('7. Mitgliedschaftsformular'),
  P('Bei der Anmeldung als Mitglied erheben wir: Anrede, Vor- und Nachname, Adresse, Postleitzahl, Ort, Telefonnummer (freiwillig) und E-Mail-Adresse. Diese Daten benötigen wir zur Begründung und Verwaltung der Mitgliedschaft.'),
  P('Der Versand der Anmeldung und der automatischen Bestätigung erfolgt über Resend (siehe Ziff. 6). Die Daten werden anschliessend in unserer Vereinsverwaltung erfasst.'),
  P({ b: 'Adressvervollständigung:' }, ' Zur Erleichterung der Eingabe nutzen wir die öffentliche Adress-Suche des Bundesamtes für Landestopografie swisstopo (api3.geo.admin.ch). Dabei wird Ihre Eingabe an diesen Dienst übermittelt. Es handelt sich um einen Dienst der Schweizerischen Eidgenossenschaft; die Daten verbleiben in der Schweiz.'),
  H3('8. Newsletter'),
  P('Für den Versand unseres Newsletters nutzen wir:'),
  P({ b: 'Brevo (Sendinblue GmbH / Brevo SAS)' }, ', Frankreich'),
  P('Die Anmeldung erfolgt im Double-Opt-in-Verfahren: Nach Ihrer Eintragung erhalten Sie eine E-Mail mit einem Bestätigungslink. Erst nach Bestätigung wird Ihre Adresse in unsere Empfängerliste aufgenommen. Damit stellen wir sicher, dass niemand ohne Einwilligung eingetragen wird.'),
  P('Gespeichert werden Ihre E-Mail-Adresse sowie Zeitpunkt der Anmeldung und Bestätigung. Sie können den Newsletter jederzeit über den Abmeldelink am Ende jeder Nachricht oder per E-Mail an ', MAIL, ' abbestellen.'),
  H3('9. Google Maps'),
  P('Auf unserer Kontaktseite verlinken wir auf Kartenmaterial von:'),
  P({ b: 'Google Ireland Limited' }, ', Gordon House, Barrow Street, Dublin 4, Irland'),
  P('Die Karte ist nicht in die Website eingebettet — beim blossen Aufruf der Kontaktseite werden keine Daten an Google übermittelt. Erst wenn Sie den Adress-Link anklicken, öffnet sich Google Maps und Ihre IP-Adresse wird an Google übermittelt; dabei können Daten in die USA übertragen werden. Weitere Informationen: ', GPRIV),
  H3('10. Externe Links und Vereinsshop'),
  P('Unser Online-Shop verweist auf das Angebot von ', { b: '11teamsports' }, ' (11teamsports GmbH). Der Kaufvorgang findet vollständig auf deren Website statt; es gelten deren Datenschutzbestimmungen. Wir erhalten keine Daten über getätigte Bestellungen.'),
  P('Gleiches gilt für Links zu unseren Auftritten auf Facebook, Instagram und WhatsApp. Erst durch Anklicken werden Daten an die jeweiligen Anbieter übermittelt.'),
  H3('11. Datensicherheit'),
  P('Diese Website nutzt eine SSL/TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie am «https://» in der Adresszeile Ihres Browsers.'),
  P('Wir treffen angemessene technische und organisatorische Sicherheitsmassnahmen zum Schutz Ihrer Personendaten. Ein lückenloser Schutz bei der Datenübertragung im Internet kann jedoch nicht garantiert werden.'),
  H3('12. Ihre Rechte'),
  P('Sie haben das Recht auf:'),
  LI('Auskunft über die von uns bearbeiteten Personendaten'),
  LI('Berichtigung unrichtiger Daten'),
  LI('Löschung Ihrer Daten'),
  LI('Einschränkung der Bearbeitung'),
  LI('Widerspruch gegen die Bearbeitung'),
  LI('Datenherausgabe bzw. -übertragung'),
  LI('Widerruf einer erteilten Einwilligung'),
  P('Zur Ausübung Ihrer Rechte genügt eine Mitteilung an ', MAIL, '. Zudem steht Ihnen ein Beschwerderecht beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu.'),
  H3('13. Änderungen'),
  P('Wir können diese Datenschutzerklärung jederzeit anpassen. Massgebend ist die jeweils auf dieser Website veröffentlichte Fassung.'),
];

const dsHr = [
  P({ b: 'Stanje:' }, ' kolovoz 2026.'),
  H3('1. Odgovorna osoba'),
  P('HNK Kroatien Schwyz\nMythencenterstrasse 21, 6438 Ibach, Švicarska\nE-mail: ', MAIL, '\nTelefon: ', TEL),
  P('Kontakt osoba za pitanja zaštite podataka: Danijel Ponjavić'),
  H3('2. Općenito'),
  P('Na temelju čl. 13 Švicarskog saveznog ustava i odredbi revidiranog Saveznog zakona o zaštiti podataka (revDSG), svaka osoba ima pravo na zaštitu svoje privatnosti te na zaštitu od zlouporabe osobnih podataka. Ako su obuhvaćene osobe iz EU, dodatno se primjenjuje Opća uredba o zaštiti podataka (GDPR).'),
  P('Vaše osobne podatke obrađujemo povjerljivo i u skladu sa zakonskim propisima. Podaci se čuvaju samo onoliko dugo koliko to zahtijeva svrha obrade ili zakonske obveze čuvanja.'),
  H3('3. Obrada pri posjetu web stranici'),
  P('Pri posjetu naše stranice naš pružatelj usluge hostinga automatski bilježi tehničke podatke u serverskim zapisima koje šalje vaš preglednik:'),
  LI('IP adresa'),
  LI('datum i vrijeme pristupa'),
  LI('posjećena stranica'),
  LI('vrsta i verzija preglednika'),
  LI('operativni sustav'),
  LI('referrer URL'),
  P('Ovi podaci služe isključivo tehničkom radu, sigurnosti i analizi grešaka. Ne spajaju se s drugim izvorima podataka.'),
  H3('4. Hosting'),
  P('Ova web stranica hostirana je kod:'),
  P({ b: 'Vercel Inc.' }, ', 340 S Lemon Ave #4133, Walnut, CA 91789, SAD'),
  P('Vercel obrađuje navedene serverske zapise po našem nalogu. Pritom može doći do prijenosa podataka u SAD.'),
  H3('5. Sustav za upravljanje sadržajem'),
  P('Sadržaj ove stranice upravlja se putem:'),
  P({ b: 'Sanity AS' }, ', Oslo, Norveška'),
  P('Slike i sadržaji isporučuju se preko Sanityjeve mreže za isporuku sadržaja (CDN). Pritom se vaša IP adresa prenosi Sanityju.'),
  H3('6. Kontakt obrazac'),
  P('Kada nam pišete preko kontakt obrasca, uneseni podaci (ime, e-mail adresa, poruka) koriste se za obradu vašeg upita. Slanje se odvija preko:'),
  P({ b: 'Resend, Inc.' }, ', SAD (lokacija servera Irska)'),
  P('Te podatke ne pohranjujemo u bazu podataka; prosljeđuju se isključivo e-mailom nama i čuvaju se u našem sandučiću onoliko dugo koliko je potrebno za obradu.'),
  H3('7. Obrazac za učlanjenje'),
  P('Pri prijavi za članstvo prikupljamo: spol, ime i prezime, adresu, poštanski broj, mjesto, broj telefona (neobavezno) i e-mail adresu. Ovi podaci potrebni su nam za zasnivanje i vođenje članstva.'),
  P('Slanje prijave i automatske potvrde odvija se preko Resenda (vidi t. 6). Podaci se zatim unose u našu evidenciju članova.'),
  P({ b: 'Dopunjavanje adrese:' }, ' Radi lakšeg unosa koristimo javnu pretragu adresa Saveznog ureda za topografiju swisstopo (api3.geo.admin.ch). Pritom se vaš unos prosljeđuje toj usluzi. Riječ je o usluzi Švicarske Konfederacije; podaci ostaju u Švicarskoj.'),
  H3('8. Newsletter'),
  P('Za slanje newslettera koristimo:'),
  P({ b: 'Brevo (Sendinblue GmbH / Brevo SAS)' }, ', Francuska'),
  P('Prijava se odvija postupkom dvostruke potvrde (double opt-in): nakon upisa primate e-mail s poveznicom za potvrdu. Tek nakon potvrde vaša se adresa uvrštava na popis primatelja. Time osiguravamo da nitko ne bude upisan bez svoje privole.'),
  P('Pohranjuju se vaša e-mail adresa te vrijeme prijave i potvrde. Newsletter možete otkazati u svakom trenutku preko poveznice za odjavu na dnu svake poruke ili e-mailom na ', MAIL, '.'),
  H3('9. Google Maps'),
  P('Na našoj kontakt stranici nalazi se poveznica na kartu tvrtke:'),
  P({ b: 'Google Ireland Limited' }, ', Gordon House, Barrow Street, Dublin 4, Irska'),
  P('Karta nije ugrađena u web stranicu — samim otvaranjem kontakt stranice podaci se ne prenose Googleu. Tek klikom na poveznicu s adresom otvara se Google Maps i vaša IP adresa prenosi se Googleu; pritom se podaci mogu prenijeti u SAD. Više informacija: ', GPRIV),
  H3('10. Vanjske poveznice i klupski shop'),
  P('Naš online shop upućuje na ponudu ', { b: '11teamsports' }, ' (11teamsports GmbH). Kupovina se u cijelosti odvija na njihovoj stranici; primjenjuju se njihova pravila o zaštiti podataka. Mi ne primamo nikakve podatke o obavljenim narudžbama.'),
  P('Isto vrijedi za poveznice na naše profile na Facebooku, Instagramu i WhatsAppu. Tek klikom na njih podaci se prenose odgovarajućim pružateljima.'),
  H3('11. Sigurnost podataka'),
  P('Ova stranica koristi SSL/TLS enkripciju. Šifriranu vezu prepoznajete po «https://» u adresnoj traci vašeg preglednika.'),
  P('Poduzimamo primjerene tehničke i organizacijske sigurnosne mjere za zaštitu vaših osobnih podataka. Potpuna zaštita pri prijenosu podataka internetom ipak se ne može jamčiti.'),
  H3('12. Vaša prava'),
  P('Imate pravo na:'),
  LI('informaciju o osobnim podacima koje obrađujemo'),
  LI('ispravak netočnih podataka'),
  LI('brisanje vaših podataka'),
  LI('ograničenje obrade'),
  LI('prigovor na obradu'),
  LI('izdavanje odnosno prijenos podataka'),
  LI('opoziv dane privole'),
  P('Za ostvarivanje svojih prava dovoljna je poruka na ', MAIL, '. Također imate pravo podnijeti pritužbu Saveznom povjereniku za zaštitu podataka i informiranje (EDÖB).'),
  H3('13. Izmjene'),
  P('Ovu izjavu o zaštiti podataka možemo izmijeniti u svakom trenutku. Mjerodavna je verzija objavljena na ovoj stranici.'),
];

const docs = [
  {
    _id: 'stranica-impressum',
    _type: 'stranica',
    title: { _type: 'localeString', hr: 'Impressum', de: 'Impressum' },
    slug: { _type: 'slug', current: 'impressum' },
    body: { _type: 'localeBlockContent', hr: impressumHr, de: impressumDe },
  },
  {
    _id: 'stranica-datenschutzerklarung',
    _type: 'stranica',
    title: { _type: 'localeString', hr: 'Izjava o zaštiti podataka', de: 'Datenschutzerklärung' },
    slug: { _type: 'slug', current: 'datenschutzerklarung' },
    body: { _type: 'localeBlockContent', hr: dsHr, de: dsDe },
  },
];

const res = await fetch(API, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify({ mutations: docs.map((d) => ({ createOrReplace: d })) }),
});
console.log(res.status, JSON.stringify(await res.json()).slice(0, 200));
