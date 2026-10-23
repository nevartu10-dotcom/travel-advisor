// Official and widely spoken languages by country (ISO 3166-1 alpha-2 → ISO 639-3),
// most widely used first. Stable reference data, so it ships with the app.
// (restcountries.com, used originally, now requires a private API key.)

const C = {
  AD: 'cat spa fra', AE: 'ara eng', AF: 'pus fas uzb', AG: 'eng', AI: 'eng', AL: 'sqi', AM: 'hye rus',
  AO: 'por', AR: 'spa', AT: 'deu', AU: 'eng', AW: 'nld pap', AX: 'swe', AZ: 'aze rus', BA: 'bos hrv srp',
  BB: 'eng', BD: 'ben eng', BE: 'nld fra deu', BF: 'fra', BG: 'bul', BH: 'ara eng', BI: 'run fra',
  BJ: 'fra', BM: 'eng', BN: 'msa eng', BO: 'spa que aym', BR: 'por', BS: 'eng', BT: 'dzo', BW: 'eng tsn',
  BY: 'bel rus', BZ: 'eng spa', CA: 'eng fra', CD: 'fra lin swa', CF: 'fra sag', CG: 'fra lin',
  CH: 'deu fra ita roh', CI: 'fra', CL: 'spa', CM: 'fra eng', CN: 'zho', CO: 'spa', CR: 'spa', CU: 'spa',
  CV: 'por', CW: 'pap nld', CY: 'ell tur eng', CZ: 'ces', DE: 'deu', DJ: 'fra ara', DK: 'dan', DM: 'eng',
  DO: 'spa', DZ: 'ara fra', EC: 'spa', EE: 'est rus', EG: 'ara eng', ER: 'tir ara eng', ES: 'spa cat eus glg',
  ET: 'amh orm', FI: 'fin swe', FJ: 'eng fij', FM: 'eng', FO: 'fao dan', FR: 'fra', GA: 'fra', GB: 'eng cym',
  GD: 'eng', GE: 'kat', GF: 'fra', GG: 'eng', GH: 'eng', GI: 'eng spa', GL: 'kal dan', GM: 'eng', GN: 'fra',
  GP: 'fra', GQ: 'spa fra por', GR: 'ell', GT: 'spa', GU: 'eng', GW: 'por', GY: 'eng', HK: 'zho eng',
  HN: 'spa', HR: 'hrv', HT: 'hat fra', HU: 'hun', ID: 'ind', IE: 'eng gle', IL: 'heb ara eng', IM: 'eng',
  IN: 'hin eng ben tel mar tam', IQ: 'ara kur', IR: 'fas', IS: 'isl', IT: 'ita', JE: 'eng', JM: 'eng',
  JO: 'ara eng', JP: 'jpn', KE: 'swa eng', KG: 'kir rus', KH: 'khm', KI: 'eng', KM: 'ara fra', KN: 'eng',
  KP: 'kor', KR: 'kor', KW: 'ara eng', KY: 'eng', KZ: 'kaz rus', LA: 'lao', LB: 'ara fra eng', LC: 'eng',
  LI: 'deu', LK: 'sin tam eng', LR: 'eng', LS: 'sot eng', LT: 'lit', LU: 'ltz fra deu', LV: 'lav rus',
  LY: 'ara', MA: 'ara fra', MC: 'fra', MD: 'ron rus', ME: 'cnr srp', MG: 'mlg fra', MH: 'mah eng',
  MK: 'mkd sqi', ML: 'fra bam', MM: 'mya', MN: 'mon', MO: 'zho por', MQ: 'fra', MR: 'ara fra', MS: 'eng',
  MT: 'mlt eng', MU: 'eng fra', MV: 'div', MW: 'eng nya', MX: 'spa', MY: 'msa eng zho', MZ: 'por',
  NA: 'eng afr', NC: 'fra', NE: 'fra hau', NG: 'eng hau yor ibo', NI: 'spa', NL: 'nld', NO: 'nob',
  NP: 'nep', NR: 'nau eng', NZ: 'eng mri', OM: 'ara eng', PA: 'spa', PE: 'spa que', PF: 'fra', PG: 'eng',
  PH: 'fil eng', PK: 'urd eng', PL: 'pol', PR: 'spa eng', PS: 'ara', PT: 'por', PW: 'eng', PY: 'spa grn',
  QA: 'ara eng', RE: 'fra', RO: 'ron', RS: 'srp', RU: 'rus', RW: 'kin fra eng swa', SA: 'ara', SB: 'eng',
  SC: 'eng fra', SD: 'ara eng', SE: 'swe', SG: 'eng zho msa tam', SI: 'slv', SK: 'slk', SL: 'eng',
  SM: 'ita', SN: 'fra wol', SO: 'som ara', SR: 'nld', SS: 'eng', ST: 'por', SV: 'spa', SY: 'ara',
  SZ: 'ssw eng', TC: 'eng', TD: 'fra ara', TG: 'fra', TH: 'tha', TJ: 'tgk rus', TL: 'por ind', TM: 'tuk rus',
  TN: 'ara fra', TO: 'ton eng', TR: 'tur', TT: 'eng', TV: 'eng', TW: 'zho', TZ: 'swa eng', UA: 'ukr',
  UG: 'eng swa', US: 'eng spa', UY: 'spa', UZ: 'uzb rus', VA: 'ita lat', VC: 'eng', VE: 'spa', VG: 'eng',
  VI: 'eng', VN: 'vie', VU: 'bis eng fra', WS: 'smo eng', XK: 'sqi srp', YE: 'ara', ZA: 'zul xho afr eng',
  ZM: 'eng', ZW: 'eng sna',
};

const NAMES = {
  afr: 'Afrikaans', amh: 'Amharic', ara: 'Arabic', aym: 'Aymara', aze: 'Azerbaijani', bam: 'Bambara',
  bel: 'Belarusian', ben: 'Bengali', bis: 'Bislama', bos: 'Bosnian', bul: 'Bulgarian', cat: 'Catalan',
  ces: 'Czech', cnr: 'Montenegrin', cym: 'Welsh', dan: 'Danish', deu: 'German', div: 'Dhivehi',
  dzo: 'Dzongkha', ell: 'Greek', eng: 'English', est: 'Estonian', eus: 'Basque', fao: 'Faroese',
  fas: 'Persian', fij: 'Fijian', fil: 'Filipino', fin: 'Finnish', fra: 'French', gle: 'Irish',
  glg: 'Galician', grn: 'Guaraní', hat: 'Haitian Creole', hau: 'Hausa', heb: 'Hebrew', hin: 'Hindi',
  hrv: 'Croatian', hun: 'Hungarian', hye: 'Armenian', ibo: 'Igbo', ind: 'Indonesian', isl: 'Icelandic',
  ita: 'Italian', jpn: 'Japanese', kal: 'Greenlandic', kat: 'Georgian', kaz: 'Kazakh', khm: 'Khmer',
  kin: 'Kinyarwanda', kir: 'Kyrgyz', kor: 'Korean', kur: 'Kurdish', lao: 'Lao', lat: 'Latin',
  lav: 'Latvian', lin: 'Lingala', lit: 'Lithuanian', ltz: 'Luxembourgish', mah: 'Marshallese',
  mar: 'Marathi', mkd: 'Macedonian', mlg: 'Malagasy', mlt: 'Maltese', mon: 'Mongolian', mri: 'Māori',
  msa: 'Malay', mya: 'Burmese', nau: 'Nauruan', nep: 'Nepali', nld: 'Dutch', nob: 'Norwegian',
  nya: 'Chichewa', orm: 'Oromo', pap: 'Papiamento', pol: 'Polish', por: 'Portuguese', pus: 'Pashto',
  que: 'Quechua', roh: 'Romansh', ron: 'Romanian', run: 'Kirundi', rus: 'Russian', sag: 'Sango',
  sin: 'Sinhala', slk: 'Slovak', slv: 'Slovenian', smo: 'Samoan', sna: 'Shona', som: 'Somali',
  sot: 'Sesotho', spa: 'Spanish', sqi: 'Albanian', srp: 'Serbian', ssw: 'Swati', swa: 'Swahili',
  swe: 'Swedish', tam: 'Tamil', tel: 'Telugu', tgk: 'Tajik', tha: 'Thai', tir: 'Tigrinya', ton: 'Tongan',
  tsn: 'Tswana', tuk: 'Turkmen', tur: 'Turkish', ukr: 'Ukrainian', urd: 'Urdu', uzb: 'Uzbek',
  vie: 'Vietnamese', wol: 'Wolof', xho: 'Xhosa', yor: 'Yoruba', zho: 'Chinese', zul: 'Zulu',
};

export function countryLanguages(cc) {
  const row = C[String(cc || '').toUpperCase()];
  if (!row) return [];
  return row.split(' ').map((code) => ({ code, name: NAMES[code] || code }));
}
