// Plug types and mains voltage by ISO 3166-1 alpha-2 country code.
// Sources: IEC World Plugs / WorldStandards reference tables, checked against Wikipedia's
// "Mains electricity by country" (2026); Brazil's older US-style sockets per the Museum of Plugs and Sockets. This is stable
// reference data, so it ships with the app instead of being fetched.

// English descriptions; the app shows translated ones (i18n keys plug.A … plug.O).
export const PLUG_TYPES = {
  A: 'Two flat parallel pins (North American, ungrounded)',
  B: 'Two flat pins plus a round earth pin (North American)',
  C: 'Two round pins (Europlug)',
  D: 'Three large round pins in a triangle (old British / Indian)',
  E: 'Two round pins, socket has a male earth pin (French)',
  F: 'Two round pins with side earth clips (Schuko)',
  G: 'Three rectangular pins (British)',
  H: 'Three pins in a V shape (Israeli)',
  I: 'Two angled flat pins plus earth (Australian / Chinese)',
  J: 'Three round pins (Swiss)',
  K: 'Two round pins plus a D-shaped earth pin (Danish)',
  L: 'Three round pins in a row (Italian)',
  M: 'Three large round pins (South African, 15 A)',
  N: 'Three round pins (Brazilian)',
  O: 'Three round pins (Thai)',
};

// code: [types in regular use, voltage, types also found in older buildings or less common sockets]
const T = {
  AD: ['CF', '230'], AE: ['CDG', '230'], AF: ['CF', '220'], AG: ['AB', '230'], AI: ['AB', '110'], AL: ['CF', '230'],
  AM: ['CF', '230'], AO: ['CF', '220'], AR: ['CI', '220'], AS: ['ABI', '120'], AT: ['CF', '230'], AU: ['I', '230'],
  AW: ['ABF', '120'], AX: ['CF', '230'], AZ: ['CF', '220'], BA: ['CF', '230'], BB: ['AB', '115'],
  BD: ['ACDGK', '220'], BE: ['CE', '230'], BF: ['CE', '220'], BG: ['CF', '230'], BH: ['G', '230'], BI: ['CE', '220'],
  BJ: ['CE', '220'], BM: ['AB', '120'], BN: ['G', '240'], BO: ['ABC', '230'], BQ: ['AB', '127'],
  BR: ['CN', '127 / 220', 'AB'], BS: ['AB', '120'], BT: ['CDFGM', '230'], BW: ['DGM', '230'], BY: ['CF', '220'],
  BZ: ['ABG', '110 / 220'], CA: ['AB', '120'], CD: ['CDE', '220'], CF: ['CE', '220'], CG: ['CE', '230'],
  CH: ['CJ', '230'], CI: ['CE', '220'], CK: ['I', '240'], CL: ['CFL', '220'], CM: ['CE', '220'], CN: ['ACI', '220'],
  CO: ['AB', '110'], CR: ['AB', '120'], CU: ['ABCL', '110 / 220'], CV: ['CF', '230'], CW: ['ABF', '127'],
  CY: ['G', '230'], CZ: ['CE', '230'], DE: ['CF', '230'], DJ: ['CE', '220'], DK: ['CEFK', '230'], DM: ['DG', '230'],
  DO: ['ABC', '120'], DZ: ['CF', '230'], EC: ['AB', '120'], EE: ['CF', '230'], EG: ['CF', '220'], ER: ['CL', '230'],
  ES: ['CF', '230', 'E'], ET: ['CEFL', '220'], FI: ['CF', '230'], FJ: ['I', '240'], FK: ['G', '240'],
  FM: ['AB', '120'], FO: ['CEFK', '230'], FR: ['CE', '230'], GA: ['CE', '220'], GB: ['G', '230', 'DM'],
  GD: ['G', '230'], GE: ['CF', '220'], GF: ['CDE', '230'], GG: ['G', '230'], GH: ['DG', '230'], GI: ['CG', '240'],
  GL: ['CEFK', '230'], GM: ['G', '230'], GN: ['CFK', '220'], GP: ['CDE', '230'], GQ: ['CE', '220'],
  GR: ['CF', '230'], GT: ['AB', '120'], GU: ['AB', '110'], GW: ['CEF', '220'], GY: ['ABDG', '240'],
  HK: ['G', '220', 'DM'], HN: ['AB', '120'], HR: ['CF', '230'], HT: ['AB', '110'], HU: ['CF', '230'],
  ID: ['CF', '230'], IE: ['G', '230'], IL: ['CH', '230'], IM: ['G', '230'], IN: ['CDM', '230'], IQ: ['CDG', '230'],
  IR: ['CF', '220'], IS: ['CF', '230'], IT: ['CFL', '230'], JE: ['G', '230'], JM: ['AB', '110'],
  JO: ['BCDFGJ', '230'], JP: ['AB', '100'], KE: ['G', '240'], KG: ['CF', '220'], KH: ['ACG', '230'],
  KI: ['I', '240'], KM: ['CE', '220'], KN: ['ABDG', '230'], KP: ['ACF', '220'], KR: ['CF', '220'], KW: ['CG', '240'],
  KY: ['AB', '120'], KZ: ['CF', '220'], LA: ['ABCEF', '230'], LB: ['ABCDG', '230'], LC: ['ABG', '240'],
  LI: ['CJ', '230'], LK: ['DGM', '230'], LR: ['AB', '120'], LS: ['M', '220'], LT: ['CF', '230'], LU: ['CF', '230'],
  LV: ['CF', '230'], LY: ['CFL', '230'], MA: ['CE', '220'], MC: ['CEF', '230', 'D'], MD: ['CF', '230'],
  ME: ['CF', '230'], MF: ['CE', '220'], MG: ['CE', '220'], MH: ['AB', '120'], MK: ['CF', '230'], ML: ['CE', '220'],
  MM: ['ACDFGI', '230'], MN: ['CEF', '230'], MO: ['G', '220', 'DM'], MQ: ['CDE', '230'], MR: ['CEF', '220'],
  MS: ['AB', '230'], MT: ['G', '230'], MU: ['CEG', '230'], MV: ['CDGJKL', '230'], MW: ['G', '230'],
  MX: ['AB', '127'], MY: ['G', '240', 'CM'], MZ: ['CFM', '220'], NA: ['DM', '220'], NC: ['CF', '220'],
  NE: ['ABCDEF', '220'], NG: ['DG', '230'], NI: ['AB', '120'], NL: ['CF', '230'], NO: ['CF', '230'],
  NP: ['CDM', '230'], NR: ['I', '240'], NU: ['I', '230'], NZ: ['I', '230'], OM: ['CG', '240'], PA: ['AB', '120'],
  PE: ['ABC', '220'], PF: ['ABCEF', '220'], PG: ['I', '240'], PH: ['ABC', '220'], PK: ['CDGM', '230'],
  PL: ['CE', '230'], PM: ['CEF', '230'], PN: ['I', '240'], PR: ['AB', '120'], PS: ['CH', '230'],
  PT: ['CF', '230', 'E'], PW: ['AB', '120'], PY: ['ABCN', '220'], QA: ['DG', '240', 'FL'], RE: ['CE', '230'],
  RO: ['CF', '230'], RS: ['CF', '230'], RU: ['CF', '220'], RW: ['CGJ', '230', 'EF'], SA: ['G', '230'],
  SB: ['GI', '230'], SC: ['G', '240'], SD: ['CDFG', '230'], SE: ['CF', '230'], SG: ['G', '230', 'CM'],
  SH: ['G', '240'], SI: ['CF', '230'], SK: ['CEF', '230'], SL: ['DG', '230'], SM: ['CFL', '230'],
  SN: ['CDEK', '230'], SO: ['CG', '220'], SR: ['CF', '127'], SS: ['CD', '230'], ST: ['CF', '230'], SV: ['AB', '120'],
  SX: ['AB', '110'], SY: ['CEL', '220'], SZ: ['M', '230'], TC: ['AB', '120'], TD: ['CDEF', '220'], TG: ['CE', '220'],
  TH: ['ABCO', '230'], TJ: ['CF', '220', 'I'], TL: ['CEFI', '220'], TM: ['BCF', '220'], TN: ['CE', '230'],
  TO: ['I', '240'], TR: ['CF', '230'], TT: ['AB', '115'], TV: ['I', '220'], TW: ['AB', '110'], TZ: ['DG', '230'],
  UA: ['CF', '230'], UG: ['G', '240'], US: ['AB', '120'], UY: ['CFIL', '220'], UZ: ['CEF', '220'],
  VA: ['CFL', '230'], VC: ['ABCEGIK', '230'], VE: ['AB', '120'], VG: ['AB', '110'], VI: ['AB', '110'],
  VN: ['ABCF', '220'], VU: ['CGI', '230'], WS: ['I', '230'], XK: ['CF', '230'], YE: ['ADG', '230'],
  ZA: ['CMN', '230'], ZM: ['CDG', '230'], ZW: ['DG', '240']
};

// Which socket types a plug of each type fits into (simplified, common cases).
const FITS = {
  A: 'AB', B: 'B', C: 'CEFJKLN', D: 'D', E: 'EF', F: 'EF', G: 'G', H: 'H', I: 'I',
  J: 'J', K: 'K', L: 'L', M: 'M', N: 'N', O: 'O',
};

/** Plug types and voltage at the destination, compared with the home country's plugs. */
export function plugInfo(countryCode, homeCode) {
  const row = T[String(countryCode || '').toUpperCase()];
  if (!row) return null;
  const types = row[0].split('');
  const older = (row[2] || '').split('').filter(Boolean);
  const home = homeCode ? T[String(homeCode).toUpperCase()] : null;
  // Three or more types in use: sockets vary between buildings, so a multi-adapter is easiest.
  const info = { types, older, all: [...types, ...older], voltage: row[1], home: null, multi: types.length + older.length >= 3 };
  if (home) {
    const homeTypes = home[0].split('');
    const fitting = homeTypes.filter((h) => types.some((t) => (FITS[h] || h).includes(t)));
    const v = parseInt(row[1], 10);
    const hv = parseInt(home[1], 10);
    info.home = {
      types: homeTypes,
      voltage: home[1],
      fitting,
      plugsFit: fitting.length === homeTypes.length,
      someFit: fitting.length > 0,
      voltageDiffers: Math.abs(v - hv) > 30,
      // Every socket type here, older ones included, takes one of the home plugs.
      fitsAll: info.all.every((t) => homeTypes.some((h) => (FITS[h] || h).includes(t))),
    };
    if (info.home.fitsAll) info.multi = false;
  }
  return info;
}
