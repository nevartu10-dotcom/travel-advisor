// Curated basics for common languages, keyed by ISO 639-3 code (the codes
// restcountries.com uses). For languages not listed here the app falls back to
// online machine translation and labels the result as such.
//
// Each entry: numbers 1-10, then phrases in PHRASE_KEYS order.
// "native~romanization" — the romanization part is shown for non-Latin scripts.

export const PHRASE_KEYS = ['hello', 'goodMorning', 'goodDay', 'goodNight', 'please', 'thankYou', 'goodbye', 'yes', 'no'];
export const PHRASE_LABELS = {
  hello: 'Hello',
  goodMorning: 'Good morning',
  goodDay: 'Good day',
  goodNight: 'Good night',
  please: 'Please',
  thankYou: 'Thank you',
  goodbye: 'Goodbye',
  yes: 'Yes',
  no: 'No',
};
export const NUMBER_WORDS_EN = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const B = {
  eng: ['English', 'one|two|three|four|five|six|seven|eight|nine|ten',
    'Hello|Good morning|Good day|Good night|Please|Thank you|Goodbye|Yes|No'],
  fin: ['Finnish', 'yksi|kaksi|kolme|neljä|viisi|kuusi|seitsemän|kahdeksan|yhdeksän|kymmenen',
    'Hei|Hyvää huomenta|Hyvää päivää|Hyvää yötä|Olkaa hyvä|Kiitos|Näkemiin|Kyllä|Ei'],
  swe: ['Swedish', 'ett|två|tre|fyra|fem|sex|sju|åtta|nio|tio',
    'Hej|God morgon|God dag|God natt|Snälla|Tack|Hej då|Ja|Nej'],
  nob: ['Norwegian', 'en|to|tre|fire|fem|seks|sju|åtte|ni|ti',
    'Hei|God morgen|God dag|God natt|Vær så snill|Takk|Ha det|Ja|Nei'],
  dan: ['Danish', 'en|to|tre|fire|fem|seks|syv|otte|ni|ti',
    'Hej|Godmorgen|Goddag|Godnat|Vær så venlig|Tak|Farvel|Ja|Nej'],
  isl: ['Icelandic', 'einn|tveir|þrír|fjórir|fimm|sex|sjö|átta|níu|tíu',
    'Halló|Góðan daginn|Góðan dag|Góða nótt|Vinsamlegast|Takk|Bless|Já|Nei'],
  est: ['Estonian', 'üks|kaks|kolm|neli|viis|kuus|seitse|kaheksa|üheksa|kümme',
    'Tere|Tere hommikust|Tere päevast|Head ööd|Palun|Aitäh|Head aega|Jah|Ei'],
  lav: ['Latvian', 'viens|divi|trīs|četri|pieci|seši|septiņi|astoņi|deviņi|desmit',
    'Sveiki|Labrīt|Labdien|Ar labu nakti|Lūdzu|Paldies|Uz redzēšanos|Jā|Nē'],
  lit: ['Lithuanian', 'vienas|du|trys|keturi|penki|šeši|septyni|aštuoni|devyni|dešimt',
    'Labas|Labas rytas|Laba diena|Labanakt|Prašau|Ačiū|Viso gero|Taip|Ne'],
  deu: ['German', 'eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn',
    'Hallo|Guten Morgen|Guten Tag|Gute Nacht|Bitte|Danke|Auf Wiedersehen|Ja|Nein'],
  nld: ['Dutch', 'een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien',
    'Hallo|Goedemorgen|Goedendag|Goedenacht|Alstublieft|Dank u wel|Tot ziens|Ja|Nee'],
  fra: ['French', 'un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix',
    'Salut|Bonjour|Bonne journée|Bonne nuit|S’il vous plaît|Merci|Au revoir|Oui|Non'],
  spa: ['Spanish', 'uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez',
    'Hola|Buenos días|Buenas tardes|Buenas noches|Por favor|Gracias|Adiós|Sí|No'],
  cat: ['Catalan', 'u|dos|tres|quatre|cinc|sis|set|vuit|nou|deu',
    'Hola|Bon dia|Bona tarda|Bona nit|Si us plau|Gràcies|Adéu|Sí|No'],
  por: ['Portuguese', 'um|dois|três|quatro|cinco|seis|sete|oito|nove|dez',
    'Olá|Bom dia|Boa tarde|Boa noite|Por favor|Obrigado / Obrigada|Adeus|Sim|Não'],
  ita: ['Italian', 'uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci',
    'Ciao|Buongiorno|Buon pomeriggio|Buonanotte|Per favore|Grazie|Arrivederci|Sì|No'],
  pol: ['Polish', 'jeden|dwa|trzy|cztery|pięć|sześć|siedem|osiem|dziewięć|dziesięć',
    'Cześć|Dzień dobry|Dzień dobry|Dobranoc|Proszę|Dziękuję|Do widzenia|Tak|Nie'],
  ces: ['Czech', 'jeden|dva|tři|čtyři|pět|šest|sedm|osm|devět|deset',
    'Ahoj|Dobré ráno|Dobrý den|Dobrou noc|Prosím|Děkuji|Na shledanou|Ano|Ne'],
  slk: ['Slovak', 'jeden|dva|tri|štyri|päť|šesť|sedem|osem|deväť|desať',
    'Ahoj|Dobré ráno|Dobrý deň|Dobrú noc|Prosím|Ďakujem|Dovidenia|Áno|Nie'],
  hun: ['Hungarian', 'egy|kettő|három|négy|öt|hat|hét|nyolc|kilenc|tíz',
    'Szia|Jó reggelt|Jó napot|Jó éjszakát|Kérem|Köszönöm|Viszontlátásra|Igen|Nem'],
  ron: ['Romanian', 'unu|doi|trei|patru|cinci|șase|șapte|opt|nouă|zece',
    'Salut|Bună dimineața|Bună ziua|Noapte bună|Vă rog|Mulțumesc|La revedere|Da|Nu'],
  hrv: ['Croatian', 'jedan|dva|tri|četiri|pet|šest|sedam|osam|devet|deset',
    'Bok|Dobro jutro|Dobar dan|Laku noć|Molim|Hvala|Doviđenja|Da|Ne'],
  srp: ['Serbian', 'jedan|dva|tri|četiri|pet|šest|sedam|osam|devet|deset',
    'Zdravo|Dobro jutro|Dobar dan|Laku noć|Molim|Hvala|Doviđenja|Da|Ne'],
  bos: ['Bosnian', 'jedan|dva|tri|četiri|pet|šest|sedam|osam|devet|deset',
    'Zdravo|Dobro jutro|Dobar dan|Laku noć|Molim|Hvala|Doviđenja|Da|Ne'],
  slv: ['Slovenian', 'ena|dve|tri|štiri|pet|šest|sedem|osem|devet|deset',
    'Živjo|Dobro jutro|Dober dan|Lahko noč|Prosim|Hvala|Nasvidenje|Da|Ne'],
  sqi: ['Albanian', 'një|dy|tre|katër|pesë|gjashtë|shtatë|tetë|nëntë|dhjetë',
    'Përshëndetje|Mirëmëngjes|Mirëdita|Natën e mirë|Ju lutem|Faleminderit|Mirupafshim|Po|Jo'],
  tur: ['Turkish', 'bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on',
    'Merhaba|Günaydın|İyi günler|İyi geceler|Lütfen|Teşekkür ederim|Hoşça kal|Evet|Hayır'],
  vie: ['Vietnamese', 'một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười',
    'Xin chào|Chào buổi sáng|Xin chào|Chúc ngủ ngon|Làm ơn|Cảm ơn|Tạm biệt|Vâng|Không'],
  ind: ['Indonesian', 'satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh',
    'Halo|Selamat pagi|Selamat siang|Selamat malam|Tolong|Terima kasih|Sampai jumpa|Ya|Tidak'],
  msa: ['Malay', 'satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh',
    'Helo|Selamat pagi|Selamat tengah hari|Selamat malam|Tolong|Terima kasih|Selamat tinggal|Ya|Tidak'],
  fil: ['Filipino', 'isa|dalawa|tatlo|apat|lima|anim|pito|walo|siyam|sampu',
    'Kumusta|Magandang umaga|Magandang araw|Magandang gabi|Pakiusap|Salamat po|Paalam|Oo|Hindi'],
  swa: ['Swahili', 'moja|mbili|tatu|nne|tano|sita|saba|nane|tisa|kumi',
    'Jambo|Habari za asubuhi|Habari za mchana|Usiku mwema|Tafadhali|Asante|Kwaheri|Ndiyo|Hapana'],
  ell: ['Greek', 'ένα~éna|δύο~dío|τρία~tría|τέσσερα~téssera|πέντε~pénde|έξι~éxi|επτά~eptá|οκτώ~októ|εννέα~ennéa|δέκα~déka',
    'Γεια σας~Yia sas|Καλημέρα~Kaliméra|Χαίρετε~Chérete|Καληνύχτα~Kaliníchta|Παρακαλώ~Parakaló|Ευχαριστώ~Efcharistó|Αντίο~Adío|Ναι~Ne|Όχι~Óchi'],
  bul: ['Bulgarian', 'едно~edno|две~dve|три~tri|четири~chetiri|пет~pet|шест~shest|седем~sedem|осем~osem|девет~devet|десет~deset',
    'Здравейте~Zdraveyte|Добро утро~Dobro utro|Добър ден~Dobar den|Лека нощ~Leka nosht|Моля~Molya|Благодаря~Blagodarya|Довиждане~Dovizhdane|Да~Da|Не~Ne'],
  mkd: ['Macedonian', 'еден~eden|два~dva|три~tri|четири~chetiri|пет~pet|шест~shest|седум~sedum|осум~osum|девет~devet|десет~deset',
    'Здраво~Zdravo|Добро утро~Dobro utro|Добар ден~Dobar den|Добра ноќ~Dobra noḱ|Ве молам~Ve molam|Благодарам~Blagodaram|Довидување~Doviduvanje|Да~Da|Не~Ne'],
  rus: ['Russian', 'один~odin|два~dva|три~tri|четыре~chetyre|пять~pyat’|шесть~shest’|семь~sem’|восемь~vosem’|девять~devyat’|десять~desyat’',
    'Здравствуйте~Zdravstvuyte|Доброе утро~Dobroye utro|Добрый день~Dobryy den’|Спокойной ночи~Spokoynoy nochi|Пожалуйста~Pozhaluysta|Спасибо~Spasibo|До свидания~Do svidaniya|Да~Da|Нет~Net'],
  ukr: ['Ukrainian', 'один~odyn|два~dva|три~try|чотири~chotyry|п’ять~p’yat’|шість~shist’|сім~sim|вісім~visim|дев’ять~dev’yat’|десять~desyat’',
    'Привіт~Pryvit|Доброго ранку~Dobroho ranku|Добрий день~Dobryy den’|На добраніч~Na dobranich|Будь ласка~Bud’ laska|Дякую~Dyakuyu|До побачення~Do pobachennya|Так~Tak|Ні~Ni'],
  heb: ['Hebrew', 'אחת~achat|שתיים~shtayim|שלוש~shalosh|ארבע~arba|חמש~chamesh|שש~shesh|שבע~sheva|שמונה~shmone|תשע~tesha|עשר~eser',
    'שלום~Shalom|בוקר טוב~Boker tov|יום טוב~Yom tov|לילה טוב~Laila tov|בבקשה~Bevakasha|תודה~Toda|להתראות~Lehitraot|כן~Ken|לא~Lo'],
  ara: ['Arabic', 'واحد~wāḥid|اثنان~ithnān|ثلاثة~thalātha|أربعة~arbaʿa|خمسة~khamsa|ستة~sitta|سبعة~sabʿa|ثمانية~thamāniya|تسعة~tisʿa|عشرة~ʿashara',
    'مرحبا~Marḥaban|صباح الخير~Ṣabāḥ al-khayr|نهارك سعيد~Nahārak saʿīd|تصبح على خير~Tuṣbiḥ ʿalā khayr|من فضلك~Min faḍlak|شكرا~Shukran|مع السلامة~Maʿa as-salāma|نعم~Naʿam|لا~Lā'],
  fas: ['Persian', 'یک~yek|دو~do|سه~se|چهار~chahār|پنج~panj|شش~shesh|هفت~haft|هشت~hasht|نه~noh|ده~dah',
    'سلام~Salām|صبح بخیر~Sobh bekheyr|روز بخیر~Ruz bekheyr|شب بخیر~Shab bekheyr|لطفاً~Lotfan|ممنون~Mamnun|خداحافظ~Khodāhāfez|بله~Bale|نه~Na'],
  hin: ['Hindi', 'एक~ek|दो~do|तीन~teen|चार~chaar|पाँच~paanch|छह~chhah|सात~saat|आठ~aath|नौ~nau|दस~das',
    'नमस्ते~Namaste|सुप्रभात~Suprabhat|नमस्ते~Namaste|शुभ रात्रि~Shubh ratri|कृपया~Kripya|धन्यवाद~Dhanyavaad|फिर मिलेंगे~Phir milenge|हाँ~Haan|नहीं~Nahin'],
  tha: ['Thai', 'หนึ่ง~nueng|สอง~song|สาม~sam|สี่~si|ห้า~ha|หก~hok|เจ็ด~chet|แปด~paet|เก้า~kao|สิบ~sip',
    'สวัสดี~Sawasdee|อรุณสวัสดิ์~Arun sawat|สวัสดี~Sawasdee|ราตรีสวัสดิ์~Ratri sawat|กรุณา~Karuna|ขอบคุณ~Khop khun|ลาก่อน~La kon|ใช่~Chai|ไม่~Mai',
    'Add “khrap” (men) or “kha” (women) at the end to sound polite.'],
  jpn: ['Japanese', '一~ichi|二~ni|三~san|四~yon|五~go|六~roku|七~nana|八~hachi|九~kyū|十~jū',
    'こんにちは~Konnichiwa|おはようございます~Ohayō gozaimasu|こんにちは~Konnichiwa|おやすみなさい~Oyasuminasai|お願いします~Onegaishimasu|ありがとうございます~Arigatō gozaimasu|さようなら~Sayōnara|はい~Hai|いいえ~Iie'],
  zho: ['Chinese (Mandarin)', '一~yī|二~èr|三~sān|四~sì|五~wǔ|六~liù|七~qī|八~bā|九~jiǔ|十~shí',
    '你好~Nǐ hǎo|早上好~Zǎoshang hǎo|您好~Nín hǎo|晚安~Wǎn’ān|请~Qǐng|谢谢~Xièxie|再见~Zàijiàn|是~Shì|不是~Bú shì'],
  kor: ['Korean', '하나~hana|둘~dul|셋~set|넷~net|다섯~daseot|여섯~yeoseot|일곱~ilgop|여덟~yeodeol|아홉~ahop|열~yeol',
    '안녕하세요~Annyeonghaseyo|좋은 아침입니다~Joeun achimimnida|안녕하세요~Annyeonghaseyo|안녕히 주무세요~Annyeonghi jumuseyo|부탁합니다~Butakamnida|감사합니다~Gamsahamnida|안녕히 계세요~Annyeonghi gyeseyo|네~Ne|아니요~Aniyo'],
};

// Alternative codes that share an entry.
const ALIAS = { nor: 'nob', nno: 'nob', cnr: 'srp', tgl: 'fil', zsm: 'msa', cmn: 'zho', est: 'est', gsw: 'deu', ltz: null };

function split(s) {
  const [text, roman] = s.split('~');
  return roman ? { text, roman } : { text };
}

export function curated(code) {
  const key = code in ALIAS ? ALIAS[code] : code;
  const row = key && B[key];
  if (!row) return null;
  const phrases = row[2].split('|').map(split);
  return {
    code,
    name: row[0],
    numbers: row[1].split('|').map(split),
    phrases: Object.fromEntries(PHRASE_KEYS.map((k, i) => [k, phrases[i]])),
    note: row[3] || null,
    source: 'curated',
  };
}

export function hasCurated(code) {
  return !!curated(code);
}

// ISO 639-3 → ISO 639-1, for the machine-translation fallback.
export const ISO3_TO_1 = {
  afr: 'af', amh: 'am', aze: 'az', bel: 'be', ben: 'bn', bis: 'bi', cym: 'cy', div: 'dv', dzo: 'dz',
  eus: 'eu', fij: 'fj', gle: 'ga', glg: 'gl', grn: 'gn', guj: 'gu', hat: 'ht', hau: 'ha', hye: 'hy',
  ibo: 'ig', kat: 'ka', kaz: 'kk', khm: 'km', kin: 'rw', kir: 'ky', kur: 'ku', lao: 'lo', ltz: 'lb',
  mal: 'ml', mar: 'mr', mlg: 'mg', mlt: 'mt', mon: 'mn', mri: 'mi', mya: 'my', nep: 'ne', nya: 'ny',
  orm: 'om', pan: 'pa', pus: 'ps', que: 'qu', run: 'rn', sin: 'si', smo: 'sm', sna: 'sn', som: 'so',
  sot: 'st', tam: 'ta', tel: 'te', tgk: 'tg', tir: 'ti', tsn: 'tn', tuk: 'tk', ton: 'to', urd: 'ur',
  uzb: 'uz', xho: 'xh', yor: 'yo', zul: 'zu', aym: 'ay', kal: 'kl', fao: 'fo', ssw: 'ss', nau: 'na',
  her: 'hz', kon: 'kg', lin: 'ln', lub: 'lu', sag: 'sg', tah: 'ty', wol: 'wo', ful: 'ff', bam: 'bm',
  hmo: 'ho', mah: 'mh', nde: 'nd', nbl: 'nr', ven: 've', tso: 'ts', roh: 'rm', lat: 'la', ell: 'el',
};
