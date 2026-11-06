// Stable country facts that ship with the app: capital, driving side, measurement units.

// Capital city (English name) by ISO 3166-1 alpha-2 code.
const CAPITALS = {
  AD: 'Andorra la Vella', AE: 'Abu Dhabi', AF: 'Kabul', AG: 'St. John’s', AI: 'The Valley', AL: 'Tirana', AM: 'Yerevan',
  AO: 'Luanda', AR: 'Buenos Aires', AT: 'Vienna', AU: 'Canberra', AW: 'Oranjestad', AX: 'Mariehamn', AZ: 'Baku',
  BA: 'Sarajevo', BB: 'Bridgetown', BD: 'Dhaka', BE: 'Brussels', BF: 'Ouagadougou', BG: 'Sofia', BH: 'Manama',
  BI: 'Gitega', BJ: 'Porto-Novo', BM: 'Hamilton', BN: 'Bandar Seri Begawan', BO: 'Sucre (seat of government: La Paz)',
  BR: 'Brasília', BS: 'Nassau', BT: 'Thimphu', BW: 'Gaborone', BY: 'Minsk', BZ: 'Belmopan', CA: 'Ottawa',
  CD: 'Kinshasa', CF: 'Bangui', CG: 'Brazzaville', CH: 'Bern', CI: 'Yamoussoukro', CL: 'Santiago', CM: 'Yaoundé',
  CN: 'Beijing', CO: 'Bogotá', CR: 'San José', CU: 'Havana', CV: 'Praia', CW: 'Willemstad', CY: 'Nicosia',
  CZ: 'Prague', DE: 'Berlin', DJ: 'Djibouti', DK: 'Copenhagen', DM: 'Roseau', DO: 'Santo Domingo', DZ: 'Algiers',
  EC: 'Quito', EE: 'Tallinn', EG: 'Cairo', ER: 'Asmara', ES: 'Madrid', ET: 'Addis Ababa', FI: 'Helsinki',
  FJ: 'Suva', FM: 'Palikir', FO: 'Tórshavn', FR: 'Paris', GA: 'Libreville', GB: 'London', GD: 'St. George’s',
  GE: 'Tbilisi', GF: 'Cayenne', GG: 'St Peter Port', GH: 'Accra', GI: 'Gibraltar', GL: 'Nuuk', GM: 'Banjul',
  GN: 'Conakry', GP: 'Basse-Terre', GQ: 'Malabo', GR: 'Athens', GT: 'Guatemala City', GU: 'Hagåtña', GW: 'Bissau',
  GY: 'Georgetown', HK: 'Hong Kong', HN: 'Tegucigalpa', HR: 'Zagreb', HT: 'Port-au-Prince', HU: 'Budapest',
  ID: 'Jakarta', IE: 'Dublin', IL: 'Jerusalem', IM: 'Douglas', IN: 'New Delhi', IQ: 'Baghdad', IR: 'Tehran',
  IS: 'Reykjavík', IT: 'Rome', JE: 'Saint Helier', JM: 'Kingston', JO: 'Amman', JP: 'Tokyo', KE: 'Nairobi',
  KG: 'Bishkek', KH: 'Phnom Penh', KI: 'Tarawa', KM: 'Moroni', KN: 'Basseterre', KP: 'Pyongyang', KR: 'Seoul',
  KW: 'Kuwait City', KY: 'George Town', KZ: 'Astana', LA: 'Vientiane', LB: 'Beirut', LC: 'Castries', LI: 'Vaduz',
  LK: 'Sri Jayawardenepura Kotte (largest city: Colombo)', LR: 'Monrovia', LS: 'Maseru', LT: 'Vilnius',
  LU: 'Luxembourg', LV: 'Riga', LY: 'Tripoli', MA: 'Rabat', MC: 'Monaco', MD: 'Chișinău', ME: 'Podgorica',
  MG: 'Antananarivo', MH: 'Majuro', MK: 'Skopje', ML: 'Bamako', MM: 'Naypyidaw', MN: 'Ulaanbaatar', MO: 'Macau',
  MQ: 'Fort-de-France', MR: 'Nouakchott', MS: 'Brades (Plymouth abandoned)', MT: 'Valletta', MU: 'Port Louis',
  MV: 'Malé', MW: 'Lilongwe', MX: 'Mexico City', MY: 'Kuala Lumpur', MZ: 'Maputo', NA: 'Windhoek', NC: 'Nouméa',
  NE: 'Niamey', NG: 'Abuja', NI: 'Managua', NL: 'Amsterdam (seat of government: The Hague)', NO: 'Oslo',
  NP: 'Kathmandu', NR: 'Yaren (no official capital)', NZ: 'Wellington', OM: 'Muscat', PA: 'Panama City', PE: 'Lima',
  PF: 'Papeete', PG: 'Port Moresby', PH: 'Manila', PK: 'Islamabad', PL: 'Warsaw', PR: 'San Juan',
  PS: 'Ramallah (administrative centre)', PT: 'Lisbon', PW: 'Ngerulmud', PY: 'Asunción', QA: 'Doha',
  RE: 'Saint-Denis', RO: 'Bucharest', RS: 'Belgrade', RU: 'Moscow', RW: 'Kigali', SA: 'Riyadh', SB: 'Honiara',
  SC: 'Victoria', SD: 'Khartoum', SE: 'Stockholm', SG: 'Singapore', SI: 'Ljubljana', SK: 'Bratislava',
  SL: 'Freetown', SM: 'San Marino', SN: 'Dakar', SO: 'Mogadishu', SR: 'Paramaribo', SS: 'Juba', ST: 'São Tomé',
  SV: 'San Salvador', SY: 'Damascus', SZ: 'Mbabane (royal capital: Lobamba)', TC: 'Cockburn Town',
  TD: 'N’Djamena', TG: 'Lomé', TH: 'Bangkok', TJ: 'Dushanbe', TL: 'Dili', TM: 'Ashgabat', TN: 'Tunis',
  TO: 'Nukuʻalofa', TR: 'Ankara', TT: 'Port of Spain', TV: 'Funafuti', TW: 'Taipei', TZ: 'Dodoma',
  UA: 'Kyiv', UG: 'Kampala', US: 'Washington, D.C.', UY: 'Montevideo', UZ: 'Tashkent', VA: 'Vatican City',
  VC: 'Kingstown', VE: 'Caracas', VG: 'Road Town', VI: 'Charlotte Amalie', VN: 'Hanoi', VU: 'Port Vila',
  WS: 'Apia', XK: 'Pristina', YE: 'Sana’a (contested; government in Aden)', ZA: 'Pretoria (also Cape Town and Bloemfontein)',
  ZM: 'Lusaka', ZW: 'Harare',
};

// Countries and territories that drive on the left.
const LEFT = new Set((
  'AG AI AU BB BD BM BN BS BT BW CC CK CX CY DM FJ FK GB GD GG GY HK ID IE IM IN JE JM JP KE KI KN KY ' +
  'LC LK LS MO MS MT MU MV MW MY MZ NA NF NP NR NU NZ PG PK PN SB SC SG SH SR SZ TC TH TL TO TT TV TZ ' +
  'UG VC VG VI WS ZA ZM ZW'
).split(' '));

export const capitalOf = (cc) => CAPITALS[String(cc || '').toUpperCase()] || '';

export const drivesOnLeft = (cc) => LEFT.has(String(cc || '').toUpperCase());

/** i18n key describing the measurement units in everyday use. */
export function unitsKey(cc) {
  switch (String(cc || '').toUpperCase()) {
    case 'US': case 'PR': case 'GU': case 'VI': return 'facts.unitsUS';
    case 'GB': return 'facts.unitsGB';
    case 'LR': return 'facts.unitsLR';
    case 'MM': return 'facts.unitsMM';
    default: return 'facts.unitsMetric';
  }
}
