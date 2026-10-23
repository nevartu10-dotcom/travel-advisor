// Helpers for deciding whether a news item is about the destination.

export function cleanTitle(title) {
  return String(title || '')
    .replace(/\s+[-|–]\s+[^-|–]{2,40}$/, '') // drop " - Site Name" tails
    .replace(/\s+/g, ' ')
    .trim();
}

// Words for a country's people/adjective that don't contain the country name itself.
const DEMONYMS = {
  ES: ['Spanish', 'Spaniard'], FR: ['French'], FI: ['Finnish', 'Finn'], NL: ['Dutch'], GB: ['British', 'Britain', 'UK', 'English', 'Scottish', 'Welsh'],
  CH: ['Swiss'], DK: ['Danish', 'Dane'], PL: ['Polish', 'Pole'], TR: ['Turkish', 'Turkey', 'Türkiye'], TH: ['Thai'], PH: ['Filipino', 'Philippine'],
  IE: ['Irish'], CZ: ['Czech'], US: ['US', 'U.S.', 'American', 'America'], NZ: ['Kiwi', 'NZ'], SE: ['Swedish', 'Swede'],
  NO: ['Norwegian'], IS: ['Icelandic'], GR: ['Greek'], CY: ['Cypriot'], PT: ['Portuguese'], DE: ['German'], AT: ['Austrian'],
  BE: ['Belgian'], LU: ['Luxembourgish'], HU: ['Hungarian'], RO: ['Romanian'], BG: ['Bulgarian'], HR: ['Croatian', 'Croat'],
  RS: ['Serbian', 'Serb'], SI: ['Slovenian', 'Slovene'], SK: ['Slovak'], EE: ['Estonian'], LV: ['Latvian'], LT: ['Lithuanian'],
  UA: ['Ukrainian'], RU: ['Russian', 'Kremlin'], IT: ['Italian'], MT: ['Maltese'], AE: ['UAE', 'Emirati', 'Dubai', 'Abu Dhabi'],
  JP: ['Japanese'], CN: ['Chinese', 'Beijing'], KR: ['Korean', 'Seoul'], VN: ['Vietnamese'], ID: ['Indonesian', 'Bali'], MY: ['Malaysian'],
  IN: ['Indian'], LK: ['Sri Lankan'], EG: ['Egyptian'], MA: ['Moroccan'], TN: ['Tunisian'], ZA: ['South African'], KE: ['Kenyan'],
  MX: ['Mexican'], BR: ['Brazilian'], AR: ['Argentine', 'Argentinian'], CL: ['Chilean'], PE: ['Peruvian'], CO: ['Colombian'],
  CA: ['Canadian'], AU: ['Australian', 'Aussie'], IL: ['Israeli'], JO: ['Jordanian'], CU: ['Cuban'], DO: ['Dominican'],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True when a headline is about the destination: it names the country, its people,
 * the city or the region. Filters out articles that only mention the country in passing.
 */
export function headlineMatcher({ countryName, countryCode, city, region }) {
  const strip = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const terms = [countryName, city, region, ...(DEMONYMS[String(countryCode || '').toUpperCase()] || [])].filter((t) => t && t.length >= 2).map(strip);
  // Abbreviations (US, UK, UAE…) only count in capitals, so "help us" isn't US news.
  const caps = terms.filter((t) => t === t.toUpperCase());
  const words = terms.filter((t) => t !== t.toUpperCase());
  const build = (list, flags) => (list.length ? new RegExp(`(^|[^\\p{L}])(${list.map(escapeRe).join('|')})(?![\\p{L}])`.replace('(?![\\p{L}])', flags.includes('i') ? '' : '(?![\\p{L}])'), flags) : null);
  const wordRe = build(words, 'iu');
  const capsRe = build(caps, 'u');
  return (title) => {
    const t = strip(title);
    return !!((wordRe && wordRe.test(t)) || (capsRe && capsRe.test(t)));
  };
}
