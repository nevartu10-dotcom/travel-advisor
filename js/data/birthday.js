// "Happy birthday, {name}!" in many languages (ISO 639-3), in each language's own word order.

const B = {
  eng: 'Happy birthday, {name}!', fin: 'Hyvää syntymäpäivää, {name}!', swe: 'Grattis på födelsedagen, {name}!',
  nob: 'Gratulerer med dagen, {name}!', dan: 'Tillykke med fødselsdagen, {name}!', isl: 'Til hamingju með afmælið, {name}!',
  est: 'Palju õnne sünnipäevaks, {name}!', lav: 'Daudz laimes dzimšanas dienā, {name}!', lit: 'Su gimtadieniu, {name}!',
  deu: 'Alles Gute zum Geburtstag, {name}!', nld: 'Gefeliciteerd met je verjaardag, {name}!', fra: 'Joyeux anniversaire, {name} !',
  spa: '¡Feliz cumpleaños, {name}!', cat: 'Per molts anys, {name}!', por: 'Feliz aniversário, {name}!',
  ita: 'Buon compleanno, {name}!', pol: 'Wszystkiego najlepszego z okazji urodzin, {name}!',
  ces: 'Všechno nejlepší k narozeninám, {name}!', slk: 'Všetko najlepšie k narodeninám, {name}!',
  hun: 'Boldog születésnapot, {name}!', ron: 'La mulți ani, {name}!', hrv: 'Sretan rođendan, {name}!',
  bos: 'Sretan rođendan, {name}!', srp: 'Srećan rođendan, {name}!', cnr: 'Srećan rođendan, {name}!',
  slv: 'Vse najboljše za rojstni dan, {name}!', sqi: 'Gëzuar ditëlindjen, {name}!', mkd: 'Среќен роденден, {name}!',
  bul: 'Честит рожден ден, {name}!', ell: 'Χρόνια πολλά, {name}!', tur: 'Doğum günün kutlu olsun, {name}!',
  rus: 'С днём рождения, {name}!', ukr: 'З днем народження, {name}!', heb: 'יום הולדת שמח, {name}!',
  ara: 'عيد ميلاد سعيد يا {name}!', fas: 'تولدت مبارک، {name}!', hin: 'जन्मदिन मुबारक हो, {name}!',
  tha: 'สุขสันต์วันเกิด {name}!', vie: 'Chúc mừng sinh nhật, {name}!', ind: 'Selamat ulang tahun, {name}!',
  msa: 'Selamat hari jadi, {name}!', fil: 'Maligayang kaarawan, {name}!', jpn: 'お誕生日おめでとう、{name}さん！',
  zho: '生日快乐，{name}！', kor: '{name}님, 생일 축하합니다!', swa: 'Heri ya siku ya kuzaliwa, {name}!',
  gle: 'Breithlá sona, {name}!', mlt: 'Għeluq sninek it-tajjeb, {name}!',
};

/** Birthday greeting in a language; drops the name part cleanly when there is no name. */
export function birthdayGreeting(code, name) {
  const tmpl = B[code];
  if (!tmpl) return null;
  if (name) return tmpl.replace('{name}', name);
  return tmpl
    .replace(/\{name\}님, /, '')
    .replace(/(、|，|، |, | يا | )\{name\}(さん)?/, '');
}
