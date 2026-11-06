// "Welcome" in many languages (ISO 639-3). Where the word depends on the person's
// gender, the entry has f (female), m (male) and n (neutral, used when not given).

const W = {
  eng: 'Welcome', fin: 'Tervetuloa', swe: 'Välkommen', nob: 'Velkommen', dan: 'Velkommen',
  isl: { f: 'Velkomin', m: 'Velkominn', n: 'Velkomin' },
  est: 'Tere tulemast', lav: 'Laipni lūdzam', lit: 'Sveiki atvykę',
  deu: 'Willkommen', nld: 'Welkom', fra: 'Bienvenue', ltz: 'Wëllkomm',
  spa: { f: 'Bienvenida', m: 'Bienvenido', n: 'Te damos la bienvenida' },
  cat: { f: 'Benvinguda', m: 'Benvingut', n: 'Et donem la benvinguda' },
  por: { f: 'Bem-vinda', m: 'Bem-vindo', n: 'Boas-vindas' },
  ita: { f: 'Benvenuta', m: 'Benvenuto', n: 'Ti diamo il benvenuto' },
  pol: 'Witaj', ces: 'Vítejte', slk: 'Vitajte', hun: 'Üdvözöljük', ron: 'Bine ai venit',
  hrv: 'Dobrodošli', srp: 'Dobrodošli', bos: 'Dobrodošli', cnr: 'Dobrodošli', slv: 'Dobrodošli',
  sqi: 'Mirë se vini', mkd: 'Добредојде', bul: 'Добре дошли', ell: 'Καλώς ήρθατε', tur: 'Hoş geldiniz',
  rus: 'Добро пожаловать', ukr: 'Ласкаво просимо', bel: 'Сардэчна запрашаем',
  heb: { f: 'ברוכה הבאה', m: 'ברוך הבא', n: 'ברוכים הבאים' },
  ara: 'أهلاً وسهلاً', fas: 'خوش آمدید', hin: 'स्वागत है', urd: 'خوش آمدید', ben: 'স্বাগতম',
  tha: 'ยินดีต้อนรับ', vie: 'Chào mừng', ind: 'Selamat datang', msa: 'Selamat datang', fil: 'Maligayang pagdating',
  jpn: 'ようこそ', zho: '欢迎', kor: '환영합니다', swa: 'Karibu', mlt: 'Merħba', gle: 'Fáilte',
};

/** The welcome word for a language code, matched to gender where the language needs it. */
export function welcomeWord(code, gender) {
  const w = W[code];
  if (!w) return null;
  if (typeof w === 'string') return w;
  return gender === 'female' ? w.f : gender === 'male' ? w.m : w.n;
}
