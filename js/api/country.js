// Country facts: English names (from the browser's built-in Intl data) and
// languages (bundled table). No network needed.
import { countryLanguages } from '../data/languages.js';

export function flagEmoji(cc) {
  if (!/^[A-Z]{2}$/i.test(cc || '')) return '🏳️';
  return String.fromCodePoint(...cc.toUpperCase().split('').map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

// Other names official advisories use for some countries.
const ALIASES = {
  CZ: ['Czech Republic'], TR: ['Turkey', 'Türkiye'], MM: ['Burma', 'Myanmar'], CI: ["Cote d'Ivoire", 'Ivory Coast'],
  KP: ['North Korea'], KR: ['South Korea'], CD: ['Democratic Republic of the Congo', 'DRC'],
  CG: ['Republic of the Congo', 'Congo'], BS: ['The Bahamas', 'Bahamas'], GM: ['The Gambia', 'Gambia'],
  TL: ['Timor-Leste', 'East Timor'], SZ: ['Eswatini', 'Swaziland'], CV: ['Cabo Verde', 'Cape Verde'],
  MK: ['North Macedonia'], FM: ['Micronesia'], VA: ['Holy See', 'Vatican City'], PS: ['Israel, the West Bank and Gaza', 'West Bank', 'Gaza'],
  US: ['United States'], GB: ['United Kingdom'], RU: ['Russia'], VN: ['Vietnam'], LA: ['Laos'], SY: ['Syria'],
  IR: ['Iran'], BO: ['Bolivia'], VE: ['Venezuela'], TZ: ['Tanzania'], MD: ['Moldova'], BN: ['Brunei'],
};

let displayNames;
function englishName(cc) {
  try {
    displayNames ||= new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(cc);
  } catch {
    return '';
  }
}

export async function getCountry(cc, fallbackName = '') {
  const code = String(cc || '').toUpperCase();
  const name = englishName(code) || fallbackName || code;
  return {
    code,
    name: fallbackName || name,
    official: name,
    altNames: [name, fallbackName, ...(ALIASES[code] || [])].filter(Boolean),
    languages: countryLanguages(code),
  };
}
