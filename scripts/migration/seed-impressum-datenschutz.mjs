// Seeds Impressum + Datenschutzerklärung (hr/de) into the stranica docs.
// Includes the cookie-consent section (§3), a conditionally-worded GA section
// (§10, valid now while inactive and later when activated) and the
// consent-gated Maps embed (§11). Run:
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
const dsDe = [
  P({ b: 'Stand:' }, ' August 2026'),
  H3('1. Verantwortliche Stelle'),
  P('HNK Kroatien Schwyz\nMythencenterstrasse 21, 6438 Ibach, Schweiz\nE-Mail: ', MAIL, '\nTelefon: ', TEL),
  P('Ansprechpartner für Datenschutzfragen: Danijel Ponjavić'),
  H3('2. Allgemeines'),
  P('Gestützt auf Art. 13 der Schweizerischen Bundesverfassung und die Bestimmungen des revidierten Bundesgesetzes über den Datenschutz (revDSG) hat jede Person Anspruch auf Schutz ihrer Privatsphäre sowie auf Schutz vor Missbrauch ihrer persönlichen Daten. Soweit Personen aus dem EU-Raum betroffen sind, richten wir uns zusätzlich nach der Datenschutz-Grundverordnung (DSGVO).'),
  P('Wir behandeln Ihre Personendaten vertraulich und entsprechend den gesetzlichen Vorschriften. Personendaten werden nur so lange aufbewahrt, wie es der Zweck der Bearbeitung erfordert oder gesetzliche Aufbewahrungspflichten es vorsehen.'),
  H3('3. Cookies und Einwilligung'),
  P('Diese Website verwendet Cookies und ähnliche Technologien (z. B. localStorage). Beim ersten Besuch erscheint ein Cookie-Banner, in dem Sie Ihre Auswahl treffen können. Wir unterscheiden drei Kategorien:'),
  LI('Notwendig: erforderlich für den Grundbetrieb der Website — Sprachwahl (Cookie «NEXT_LOCALE», bis zum Ende der Browsersitzung) und die Speicherung Ihrer Cookie-Auswahl («hnk-consent» im localStorage, 12 Monate). Diese können nicht deaktiviert werden.'),
  LI('Statistik: anonymisierte Besucherstatistik (Google Analytics, siehe Ziff. 11). Wird nur mit Ihrer Einwilligung geladen.'),
  LI('Externe Inhalte: Inhalte von Drittanbietern, z. B. die Google Karte auf der Kontaktseite (siehe Ziff. 12). Werden nur mit Ihrer Einwilligung geladen.'),
  P('Ohne Ihre Einwilligung werden keine Dienste der Kategorien «Statistik» und «Externe Inhalte» geladen und es wird keine Verbindung zu den entsprechenden Drittservern aufgebaut. Rechtsgrundlage für diese Kategorien ist Ihre Einwilligung.'),
  P('Ihre Auswahl wird zusammen mit der Version des Banners und dem genauen Zeitpunkt der Einwilligung lokal in Ihrem Browser gespeichert und gilt für 12 Monate. Sie können Ihre Auswahl jederzeit über den Link ', { b: '«Cookie-Einstellungen»' }, ' im Seitenfuss ändern oder widerrufen. Bei inhaltlichen Änderungen des Banners werden Sie erneut um Einwilligung gebeten.'),
  H3('4. Bearbeitung beim Besuch der Website'),
  P('Beim Besuch unserer Website werden durch unseren Hosting-Provider automatisch technische Daten in Server-Logfiles erfasst, die Ihr Browser übermittelt:'),
  LI('IP-Adresse'),
  LI('Datum und Uhrzeit des Zugriffs'),
  LI('aufgerufene Seite'),
  LI('Browsertyp und -version'),
  LI('Betriebssystem'),
  LI('Referrer-URL'),
  P('Diese Daten dienen ausschliesslich dem technischen Betrieb, der Sicherheit und der Fehleranalyse. Eine Zusammenführung mit anderen Datenquellen findet nicht statt.'),
  H3('5. Hosting'),
  P('Diese Website wird gehostet bei:'),
  P({ b: 'Vercel Inc.' }, ', 340 S Lemon Ave #4133, Walnut, CA 91789, USA'),
  P('Vercel bearbeitet die oben genannten Server-Logdaten in unserem Auftrag. Es kann dabei zu einer Übermittlung von Daten in die USA kommen.'),
  P('Zur Reichweitenmessung nutzen wir zudem Vercel Analytics und Vercel Speed Insights. Diese Dienste arbeiten ohne Cookies und ohne persönliche Identifikatoren: Erfasst werden nur aggregierte Nutzungs- und Leistungsdaten, IP-Adressen werden nicht gespeichert und es findet kein seitenübergreifendes Tracking statt. Eine Einwilligung ist dafür nicht erforderlich.'),
  H3('6. Content-Management-System'),
  P('Die Inhalte dieser Website werden verwaltet mit:'),
  P({ b: 'Sanity AS' }, ', Oslo, Norwegen'),
  P('Bilder und Inhalte werden über das Content Delivery Network von Sanity ausgeliefert. Dabei wird Ihre IP-Adresse an Sanity übermittelt.'),
  H3('7. Kontaktformular'),
  P('Wenn Sie uns über das Kontaktformular schreiben, werden die von Ihnen eingegebenen Daten (Name, E-Mail-Adresse, Nachricht) zur Bearbeitung Ihrer Anfrage verwendet. Der Versand erfolgt über:'),
  P({ b: 'Resend, Inc.' }, ', USA (Serverstandort Irland)'),
  P('Wir speichern diese Daten nicht in einer Datenbank; sie werden ausschliesslich per E-Mail an uns übermittelt und in unserem Postfach aufbewahrt, solange dies zur Bearbeitung erforderlich ist.'),
  H3('8. Mitgliedschaftsformular'),
  P('Bei der Anmeldung als Mitglied erheben wir: Anrede, Vor- und Nachname, Adresse, Postleitzahl, Ort, Telefonnummer (freiwillig) und E-Mail-Adresse. Diese Daten benötigen wir zur Begründung und Verwaltung der Mitgliedschaft.'),
  P('Der Versand der Anmeldung und der automatischen Bestätigung erfolgt über Resend (siehe Ziff. 7). Die Daten werden anschliessend in unserer Vereinsverwaltung erfasst.'),
  P({ b: 'Adressvervollständigung:' }, ' Zur Erleichterung der Eingabe nutzen wir die öffentliche Adress-Suche des Bundesamtes für Landestopografie swisstopo (api3.geo.admin.ch). Dabei wird Ihre Eingabe an diesen Dienst übermittelt. Es handelt sich um einen Dienst der Schweizerischen Eidgenossenschaft; die Daten verbleiben in der Schweiz.'),
  H3('9. Newsletter'),
  P('Für den Versand unseres Newsletters nutzen wir:'),
  P({ b: 'Brevo (Sendinblue GmbH / Brevo SAS)' }, ', Frankreich'),
  P('Die Anmeldung erfolgt im Double-Opt-in-Verfahren: Nach Ihrer Eintragung erhalten Sie eine E-Mail mit einem Bestätigungslink. Erst nach Bestätigung wird Ihre Adresse in unsere Empfängerliste aufgenommen. Damit stellen wir sicher, dass niemand ohne Einwilligung eingetragen wird.'),
  P('Gespeichert werden Ihre E-Mail-Adresse sowie Zeitpunkt der Anmeldung und Bestätigung. Sie können den Newsletter jederzeit über den Abmeldelink am Ende jeder Nachricht oder per E-Mail an ', MAIL, ' abbestellen.'),
  H3('10. Anmeldung zu Veranstaltungen'),
  P('Für einzelne Veranstaltungen bieten wir eine Online-Anmeldung an. Dabei erheben wir je nach Veranstaltung: Vor- und Nachname bzw. Teamname und Kontaktperson, E-Mail-Adresse, Telefonnummer (freiwillig), Anzahl Personen sowie eine allfällige Bemerkung.'),
  P('Diese Daten verwenden wir ausschliesslich für die Organisation und Durchführung der jeweiligen Veranstaltung — Teilnehmerliste, Kontaktaufnahme bei Änderungen und Abrechnung eines allfälligen Startgelds. Die Anmeldungen werden in unserem Content-Management-System Sanity (siehe Ziff. 6) gespeichert; Bestätigungs- und Benachrichtigungs-E-Mails werden über Resend (siehe Ziff. 7) versendet.'),
  P('Sie können Ihre Anmeldung jederzeit über den Stornierungslink in der Bestätigungs-E-Mail stornieren. Anmeldedaten bewahren wir nur so lange auf, wie es für die Durchführung und Abrechnung der Veranstaltung erforderlich ist; danach werden sie gelöscht. Eine Löschung können Sie zudem jederzeit per E-Mail an ', MAIL, ' verlangen.'),
  H3('11. Google Analytics'),
  P('Diese Website ist für den Einsatz von Google Analytics 4 vorbereitet, einem Webanalysedienst der ', { b: 'Google Ireland Limited' }, ', Gordon House, Barrow Street, Dublin 4, Irland.'),
  P('Google Analytics wird ausschliesslich geladen, wenn Sie in die Kategorie «Statistik» eingewilligt haben. Ohne Einwilligung wird der Dienst nicht geladen und es werden keine Daten an Google übermittelt. Zusätzlich setzen wir den Google Consent Mode v2 ein: Alle Einwilligungssignale stehen standardmässig auf «denied» und werden erst nach Ihrer Einwilligung aktualisiert.'),
  P('Bei erteilter Einwilligung verarbeitet Google Analytics 4 Informationen über Ihre Nutzung der Website (aufgerufene Seiten, Verweildauer, ungefährer Standort, Gerätetyp). IP-Adressen werden dabei nicht protokolliert. Die Daten können in die USA übertragen werden; Google ist unter dem Swiss–U.S. Data Privacy Framework zertifiziert. Die von Google Analytics gesetzten Cookies (_ga, _ga_*) haben eine Laufzeit von bis zu 2 Jahren.'),
  P('Ihre Einwilligung können Sie jederzeit über den Link «Cookie-Einstellungen» im Seitenfuss widerrufen. Weitere Informationen: ', GPRIV),
  H3('12. Google Maps'),
  P('Auf unserer Kontaktseite binden wir eine interaktive Karte ein von:'),
  P({ b: 'Google Ireland Limited' }, ', Gordon House, Barrow Street, Dublin 4, Irland'),
  P('Die Karte wird erst geladen, wenn Sie in die Kategorie «Externe Inhalte» eingewilligt haben oder in der Kartenvorschau auf «Karte anzeigen» klicken. Vorher wird keine Verbindung zu Google aufgebaut und es werden keine Daten übermittelt. Nach dem Laden wird Ihre IP-Adresse an Google übermittelt; dabei können Daten in die USA übertragen werden. Ihre Einwilligung können Sie jederzeit über die «Cookie-Einstellungen» im Seitenfuss widerrufen. Weitere Informationen: ', GPRIV),
  H3('13. Externe Links und Vereinsshop'),
  P('Unser Online-Shop verweist auf das Angebot von ', { b: '11teamsports' }, ' (11teamsports GmbH). Der Kaufvorgang findet vollständig auf deren Website statt; es gelten deren Datenschutzbestimmungen. Wir erhalten keine Daten über getätigte Bestellungen.'),
  P('Gleiches gilt für Links zu unseren Auftritten auf Facebook, Instagram und WhatsApp. Erst durch Anklicken werden Daten an die jeweiligen Anbieter übermittelt.'),
  H3('14. Datensicherheit'),
  P('Diese Website nutzt eine SSL/TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie am «https://» in der Adresszeile Ihres Browsers.'),
  P('Wir treffen angemessene technische und organisatorische Sicherheitsmassnahmen zum Schutz Ihrer Personendaten. Ein lückenloser Schutz bei der Datenübertragung im Internet kann jedoch nicht garantiert werden.'),
  H3('15. Ihre Rechte'),
  P('Sie haben das Recht auf:'),
  LI('Auskunft über die von uns bearbeiteten Personendaten'),
  LI('Berichtigung unrichtiger Daten'),
  LI('Löschung Ihrer Daten'),
  LI('Einschränkung der Bearbeitung'),
  LI('Widerspruch gegen die Bearbeitung'),
  LI('Datenherausgabe bzw. -übertragung'),
  LI('Widerruf einer erteilten Einwilligung'),
  P('Zur Ausübung Ihrer Rechte genügt eine Mitteilung an ', MAIL, '. Zudem steht Ihnen ein Beschwerderecht beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu.'),
  H3('16. Änderungen'),
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
  H3('3. Kolačići i privola'),
  P('Ova web stranica koristi kolačiće i slične tehnologije (npr. localStorage). Pri prvom posjetu prikazuje se banner za kolačiće u kojem možete napraviti svoj izbor. Razlikujemo tri kategorije:'),
  LI('Nužni: potrebni za osnovni rad stranice — odabir jezika (kolačić «NEXT_LOCALE», do kraja sesije preglednika) i pohrana vašeg odabira kolačića («hnk-consent» u localStorageu, 12 mjeseci). Ne mogu se isključiti.'),
  LI('Statistika: anonimizirana statistika posjeta (Google Analytics, vidi t. 11). Učitava se samo uz vašu privolu.'),
  LI('Vanjski sadržaj: sadržaj trećih strana, npr. Google karta na kontakt stranici (vidi t. 12). Učitava se samo uz vašu privolu.'),
  P('Bez vaše privole ne učitavaju se usluge iz kategorija «Statistika» i «Vanjski sadržaj» niti se uspostavlja veza s odgovarajućim poslužiteljima trećih strana. Pravna osnova za te kategorije je vaša privola.'),
  P('Vaš izbor pohranjuje se lokalno u vašem pregledniku zajedno s verzijom bannera i točnim vremenom privole te vrijedi 12 mjeseci. Izbor možete u svakom trenutku promijeniti ili opozvati putem poveznice ', { b: '«Postavke kolačića»' }, ' u podnožju stranice. Kod sadržajnih izmjena bannera ponovno ćemo vas zatražiti privolu.'),
  H3('4. Obrada pri posjetu web stranici'),
  P('Pri posjetu naše stranice naš pružatelj usluge hostinga automatski bilježi tehničke podatke u serverskim zapisima koje šalje vaš preglednik:'),
  LI('IP adresa'),
  LI('datum i vrijeme pristupa'),
  LI('posjećena stranica'),
  LI('vrsta i verzija preglednika'),
  LI('operativni sustav'),
  LI('referrer URL'),
  P('Ovi podaci služe isključivo tehničkom radu, sigurnosti i analizi grešaka. Ne spajaju se s drugim izvorima podataka.'),
  H3('5. Hosting'),
  P('Ova web stranica hostirana je kod:'),
  P({ b: 'Vercel Inc.' }, ', 340 S Lemon Ave #4133, Walnut, CA 91789, SAD'),
  P('Vercel obrađuje navedene serverske zapise po našem nalogu. Pritom može doći do prijenosa podataka u SAD.'),
  P('Za mjerenje posjećenosti dodatno koristimo Vercel Analytics i Vercel Speed Insights. Te usluge rade bez kolačića i bez osobnih identifikatora: prikupljaju se samo agregirani podaci o korištenju i performansama, IP adrese se ne pohranjuju i nema praćenja preko više stranica. Za to nije potrebna privola.'),
  H3('6. Sustav za upravljanje sadržajem'),
  P('Sadržaj ove stranice upravlja se putem:'),
  P({ b: 'Sanity AS' }, ', Oslo, Norveška'),
  P('Slike i sadržaji isporučuju se preko Sanityjeve mreže za isporuku sadržaja (CDN). Pritom se vaša IP adresa prenosi Sanityju.'),
  H3('7. Kontakt obrazac'),
  P('Kada nam pišete preko kontakt obrasca, uneseni podaci (ime, e-mail adresa, poruka) koriste se za obradu vašeg upita. Slanje se odvija preko:'),
  P({ b: 'Resend, Inc.' }, ', SAD (lokacija servera Irska)'),
  P('Te podatke ne pohranjujemo u bazu podataka; prosljeđuju se isključivo e-mailom nama i čuvaju se u našem sandučiću onoliko dugo koliko je potrebno za obradu.'),
  H3('8. Obrazac za učlanjenje'),
  P('Pri prijavi za članstvo prikupljamo: spol, ime i prezime, adresu, poštanski broj, mjesto, broj telefona (neobavezno) i e-mail adresu. Ovi podaci potrebni su nam za zasnivanje i vođenje članstva.'),
  P('Slanje prijave i automatske potvrde odvija se preko Resenda (vidi t. 7). Podaci se zatim unose u našu evidenciju članova.'),
  P({ b: 'Dopunjavanje adrese:' }, ' Radi lakšeg unosa koristimo javnu pretragu adresa Saveznog ureda za topografiju swisstopo (api3.geo.admin.ch). Pritom se vaš unos prosljeđuje toj usluzi. Riječ je o usluzi Švicarske Konfederacije; podaci ostaju u Švicarskoj.'),
  H3('9. Newsletter'),
  P('Za slanje newslettera koristimo:'),
  P({ b: 'Brevo (Sendinblue GmbH / Brevo SAS)' }, ', Francuska'),
  P('Prijava se odvija postupkom dvostruke potvrde (double opt-in): nakon upisa primate e-mail s poveznicom za potvrdu. Tek nakon potvrde vaša se adresa uvrštava na popis primatelja. Time osiguravamo da nitko ne bude upisan bez svoje privole.'),
  P('Pohranjuju se vaša e-mail adresa te vrijeme prijave i potvrde. Newsletter možete otkazati u svakom trenutku preko poveznice za odjavu na dnu svake poruke ili e-mailom na ', MAIL, '.'),
  H3('10. Prijave na događaje'),
  P('Za pojedine događaje nudimo online prijavu. Pritom, ovisno o događaju, prikupljamo: ime i prezime odnosno naziv ekipe i kontakt osobu, e-mail adresu, broj telefona (neobavezno), broj osoba te eventualnu napomenu.'),
  P('Te podatke koristimo isključivo za organizaciju i provedbu dotičnog događaja — popis sudionika, kontakt kod izmjena i obračun eventualne kotizacije. Prijave se pohranjuju u našem sustavu za upravljanje sadržajem Sanity (vidi t. 6); e-mailovi s potvrdom i obavijestima šalju se preko Resenda (vidi t. 7).'),
  P('Prijavu možete u svakom trenutku otkazati preko poveznice za otkazivanje u e-mailu s potvrdom. Podatke o prijavama čuvamo samo onoliko dugo koliko je potrebno za provedbu i obračun događaja; nakon toga se brišu. Brisanje možete zatražiti i u svakom trenutku e-mailom na ', MAIL, '.'),
  H3('11. Google Analytics'),
  P('Ova web stranica pripremljena je za korištenje usluge Google Analytics 4, web analitičke usluge tvrtke ', { b: 'Google Ireland Limited' }, ', Gordon House, Barrow Street, Dublin 4, Irska.'),
  P('Google Analytics učitava se isključivo ako ste dali privolu za kategoriju «Statistika». Bez privole usluga se ne učitava i nikakvi se podaci ne prenose Googleu. Dodatno koristimo Google Consent Mode v2: svi signali privole standardno su postavljeni na «denied» i ažuriraju se tek nakon vaše privole.'),
  P('Uz danu privolu Google Analytics 4 obrađuje informacije o vašem korištenju stranice (posjećene stranice, trajanje posjeta, približna lokacija, vrsta uređaja). IP adrese se pritom ne zapisuju. Podaci se mogu prenijeti u SAD; Google je certificiran prema Swiss–U.S. Data Privacy Frameworku. Kolačići koje postavlja Google Analytics (_ga, _ga_*) traju do 2 godine.'),
  P('Privolu možete u svakom trenutku opozvati putem poveznice «Postavke kolačića» u podnožju stranice. Više informacija: ', GPRIV),
  H3('12. Google Maps'),
  P('Na našoj kontakt stranici ugrađujemo interaktivnu kartu tvrtke:'),
  P({ b: 'Google Ireland Limited' }, ', Gordon House, Barrow Street, Dublin 4, Irska'),
  P('Karta se učitava tek kada date privolu za kategoriju «Vanjski sadržaj» ili kliknete na «Prikaži kartu» u pretpregledu karte. Prije toga ne uspostavlja se veza s Googleom niti se prenose podaci. Nakon učitavanja vaša IP adresa prenosi se Googleu; pritom se podaci mogu prenijeti u SAD. Privolu možete u svakom trenutku opozvati putem «Postavki kolačića» u podnožju stranice. Više informacija: ', GPRIV),
  H3('13. Vanjske poveznice i klupski shop'),
  P('Naš online shop upućuje na ponudu ', { b: '11teamsports' }, ' (11teamsports GmbH). Kupovina se u cijelosti odvija na njihovoj stranici; primjenjuju se njihova pravila o zaštiti podataka. Mi ne primamo nikakve podatke o obavljenim narudžbama.'),
  P('Isto vrijedi za poveznice na naše profile na Facebooku, Instagramu i WhatsAppu. Tek klikom na njih podaci se prenose odgovarajućim pružateljima.'),
  H3('14. Sigurnost podataka'),
  P('Ova stranica koristi SSL/TLS enkripciju. Šifriranu vezu prepoznajete po «https://» u adresnoj traci vašeg preglednika.'),
  P('Poduzimamo primjerene tehničke i organizacijske sigurnosne mjere za zaštitu vaših osobnih podataka. Potpuna zaštita pri prijenosu podataka internetom ipak se ne može jamčiti.'),
  H3('15. Vaša prava'),
  P('Imate pravo na:'),
  LI('informaciju o osobnim podacima koje obrađujemo'),
  LI('ispravak netočnih podataka'),
  LI('brisanje vaših podataka'),
  LI('ograničenje obrade'),
  LI('prigovor na obradu'),
  LI('izdavanje odnosno prijenos podataka'),
  LI('opoziv dane privole'),
  P('Za ostvarivanje svojih prava dovoljna je poruka na ', MAIL, '. Također imate pravo podnijeti pritužbu Saveznom povjereniku za zaštitu podataka i informiranje (EDÖB).'),
  H3('16. Izmjene'),
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
