export type Quiz = {
  q: string;
  options: [string, string, string, string];
  answer: number;
};

export type FigureKind = "king" | "god";
export type RelicKind = "amulet" | "tablet";
export type HandKind = FigureKind | RelicKind;

export type Figure = {
  id: string;
  name: string;
  epithet: string;
  kind: FigureKind;
  value: 5 | 10;
  image: string;
  museum: string;
  riddle: string;
  opensLeft: boolean;
  quiz: Quiz;
};

export type Relic = {
  id: string;
  name: string;
  epithet: string;
  kind: RelicKind;
  value: 1 | 2;
};

export type HandCard = Figure | Relic;

export const KIND_LABEL: Record<HandKind, string> = {
  king: "ملك",
  god: "معبود",
  amulet: "تعويذة",
  tablet: "أثر",
};

export const FIGURES: Figure[] = [
  {
    id: "tut",
    name: "توت عنخ آمون",
    epithet: "القناع الذهبي",
    kind: "king",
    value: 5,
    image: "/cards/tut.jpg",
    museum: "المتحف المصري",
    riddle: "قناع ذهب ولازورد لملك اتدفن صغير، وهوارد كارتر فتح بابه سنة ١٩٢٢.",
    opensLeft: true,
    quiz: {
      q: "القناع الذهبي لتوت عنخ آمون وزنه تقريبًا كام؟",
      options: ["حوالي كيلو", "حوالي ١٠ كيلو", "حوالي ٤٠ كيلو", "أكتر من ١٠٠ كيلو"],
      answer: 1,
    },
  },
  {
    id: "nefertiti",
    name: "نفرتيتي",
    epithet: "الجميلة أتت",
    kind: "king",
    value: 5,
    image: "/cards/nefertiti.jpg",
    museum: "متحف برلين",
    riddle: "رأس ملكة من الحجر الجيري، عين واحدة ناقصة، والتاج أزرق طويل.",
    opensLeft: false,
    quiz: {
      q: "رأس نفرتيتي لقاه أنهي حفار في تل العمارنة؟",
      options: ["هوارد كارتر", "لودفيج بورخارت", "فلندرز بيتري", "أوغست ماريت"],
      answer: 1,
    },
  },
  {
    id: "ramses",
    name: "رمسيس الثاني",
    epithet: "ممنون الأصغر",
    kind: "king",
    value: 5,
    image: "/cards/ramses.jpg",
    museum: "المتحف البريطاني",
    riddle: "رأس جرانيتي ضخم لملك حروب، واسمه في المتحف ممنون الأصغر.",
    opensLeft: false,
    quiz: {
      q: "تمثال ممنون الأصغر اتنقل من أنهي معبد؟",
      options: ["معبد الأقصر", "الرامسيوم", "الكرنك", "الدير البحري"],
      answer: 1,
    },
  },
  {
    id: "hatshepsut",
    name: "حتشبسوت",
    epithet: "التاج المزدوج",
    kind: "king",
    value: 5,
    image: "/cards/hatshepsut.jpg",
    museum: "المتروبوليتان",
    riddle: "ملكة قعدت على الكرسي بلحية الملوك، وتمثالها الجيري جالس في نيويورك.",
    opensLeft: false,
    quiz: {
      q: "مهندس معبد حتشبسوت في الدير البحري؟",
      options: ["إمحوتب", "سننموت", "أمنحتب بن حابو", "حور محب"],
      answer: 1,
    },
  },
  {
    id: "khafre",
    name: "خفرع",
    epithet: "حورس ورا الرأس",
    kind: "king",
    value: 5,
    image: "/cards/khafre.jpg",
    museum: "المتحف المصري",
    riddle: "ملك جالس من حجر أسود، وصقر حورس باسط جناحه ورا رأسه.",
    opensLeft: true,
    quiz: {
      q: "تمثال خفرع الديوريت لقوه في أنهي حتة؟",
      options: ["معبد الوادي", "قمة الهرم", "سقارة", "واحة سيوة"],
      answer: 0,
    },
  },
  {
    id: "akhenaten",
    name: "أخناتون",
    epithet: "عمود الكرنك",
    kind: "king",
    value: 5,
    image: "/cards/akhenaten.jpg",
    museum: "المتحف المصري",
    riddle: "جسد طويل وبطن بارز وذقن مسحوب، وعابد لقرص الشمس لوحده.",
    opensLeft: false,
    quiz: {
      q: "حدود مدينة أخناتون متسجلة على إيه؟",
      options: ["حجر باليرمو", "لوحات الحدود", "بردية وستكار", "قائمة أبيدوس"],
      answer: 1,
    },
  },
  {
    id: "anubis",
    name: "أنوبيس",
    epithet: "حارس المقصورة",
    kind: "god",
    value: 10,
    image: "/cards/anubis.jpg",
    museum: "المتحف المصري",
    riddle: "ابن آوى أسود رابض فوق صندوق، وذهب حوالين رقبته.",
    opensLeft: true,
    quiz: {
      q: "من أولاد حورس الأربعة، مين اللي رأسه ابن آوى؟",
      options: ["إمستي", "حابي", "دوا-موت-إف", "قبح-سنو-إف"],
      answer: 2,
    },
  },
  {
    id: "bastet",
    name: "باستت",
    epithet: "قطة جير أندرسون",
    kind: "god",
    value: 10,
    image: "/cards/bastet.jpg",
    museum: "المتحف البريطاني",
    riddle: "قطة برونز بحلق ذهب وخاتم في مناخيرها، خارجة من سقارة.",
    opensLeft: false,
    quiz: {
      q: "قطة جير-أندرسون بترجع تقريبًا لأنهي عصر؟",
      options: ["الدولة القديمة", "الدولة الوسطى", "الأسرة السادسة والعشرين", "العصر الروماني"],
      answer: 2,
    },
  },
  {
    id: "horus",
    name: "حورس",
    epithet: "صقر إدفو",
    kind: "god",
    value: 10,
    image: "/cards/horus.jpg",
    museum: "معبد إدفو",
    riddle: "صقر من الحجر واقف قدام جدار معبد، وعينه وقاية.",
    opensLeft: false,
    quiz: {
      q: "كسور عين حورس الستة مجموعها كام؟",
      options: ["١/٢", "٣/٤", "٧/٨", "٦٣/٦٤"],
      answer: 3,
    },
  },
  {
    id: "sekhmet",
    name: "سخمت",
    epithet: "اللبؤة",
    kind: "god",
    value: 10,
    image: "/cards/sekhmet.jpg",
    museum: "المتحف البريطاني",
    riddle: "لبؤة من الجرانيت الأسود، وقرص الشمس فوق رأسها، وصفوفها في قاعة واحدة.",
    opensLeft: true,
    quiz: {
      q: "رع سكر سخمت بإيه عشان تبطل القتل؟",
      options: ["لبن", "جعة مخلوطة بمغرة", "عسل", "مية النيل"],
      answer: 1,
    },
  },
  {
    id: "thoth",
    name: "تحوت",
    epithet: "البابون",
    kind: "god",
    value: 10,
    image: "/cards/thoth.jpg",
    museum: "المتروبوليتان",
    riddle: "قرد بابون ماسك قرص القمر، وكاتب الآلهة وصاحب القلم.",
    opensLeft: false,
    quiz: {
      q: "تحوت كسب كام يوم عشان نيوت تولّد الآلهة الخمسة؟",
      options: ["٣", "٥", "٧", "١٠"],
      answer: 1,
    },
  },
  {
    id: "isis",
    name: "إيزيس",
    epithet: "ترضع حورس",
    kind: "god",
    value: 10,
    image: "/cards/isis.jpg",
    museum: "متحف بروكلين",
    riddle: "أم قاعدة ترضع طفلها، وعلى رأسها قرص وبين قرنين.",
    opensLeft: false,
    quiz: {
      q: "إيزيس لقيت تابوت أوزير جوه شجرة في أنهي مدينة؟",
      options: ["بيبلوس", "أوغاريت", "طيبة", "منف"],
      answer: 0,
    },
  },
];

function relic(id: string, name: string, epithet: string, kind: RelicKind, value: 1 | 2): Relic {
  return { id, name, epithet, kind, value };
}

export const RELICS: Relic[] = [
  relic("scarab-1", "جعران", "قلب", "amulet", 1),
  relic("scarab-2", "جعران", "قلب", "amulet", 1),
  relic("scarab-3", "جعران", "صدرية", "amulet", 1),
  relic("scarab-4", "جعران", "ختم", "amulet", 1),
  relic("ankh-1", "عنخ", "حياة", "amulet", 1),
  relic("ankh-2", "عنخ", "مفتاح", "amulet", 1),
  relic("wedjat-1", "عين واجت", "وقاية", "amulet", 1),
  relic("wedjat-2", "عين واجت", "كمال", "amulet", 1),
  relic("shabti-1", "أوشبتي", "خادم", "tablet", 2),
  relic("shabti-2", "أوشبتي", "مجيب", "tablet", 2),
  relic("shabti-3", "أوشبتي", "حقل", "tablet", 2),
  relic("shabti-4", "أوشبتي", "معول", "tablet", 2),
  relic("canopic-1", "إناء كانوبي", "أحشاء", "tablet", 2),
  relic("canopic-2", "إناء كانوبي", "حارس", "tablet", 2),
  relic("djed-1", "عمود الجد", "ثبات", "tablet", 2),
  relic("djed-2", "عمود الجد", "عمود", "tablet", 2),
];

const ALL = new Map<string, HandCard>([...FIGURES, ...RELICS].map((card) => [card.id, card]));

export function cardById(id: string): HandCard {
  const card = ALL.get(id);
  if (!card) throw new Error(`Unknown card ${id}`);
  return card;
}

export function figureById(id: string): Figure {
  const card = cardById(id);
  if (card.kind !== "king" && card.kind !== "god") throw new Error(`Not a figure ${id}`);
  return card;
}

export function isFigure(card: HandCard): card is Figure {
  return card.kind === "king" || card.kind === "god";
}

export const AMULET_IDS = RELICS.filter((card) => card.kind === "amulet").map((card) => card.id);
export const TABLET_IDS = RELICS.filter((card) => card.kind === "tablet").map((card) => card.id);
