import { CULTURE_NAME, PIECES, type Piece } from "./catalog.ts";

export type Topic = "piece" | "curriculum" | "hiero";

export type Ask = {
  id: string;
  fact: string;
  stem: string;
  options: [string, string, string, string];
  answer: number;
  topic: Topic;
  pieceId: string | null;
  glyphs: string | null;
  hard: boolean;
};

type Quad = [string, string, string, string];

const STORE_KEY = "pharaoh-used";

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngOf(seed: string): () => number {
  let x = hash(seed) || 1;
  return () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

export function shuffle<T>(list: readonly T[], rng: () => number = Math.random): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = next[i];
    next[i] = next[j] as T;
    next[j] = swap as T;
  }
  return next;
}

function quad(correct: string, distractors: string[], seed: string): Quad | null {
  const unique = [...new Set(distractors.filter((item) => item && item !== correct))];
  if (unique.length < 3) return null;
  const picked = shuffle(unique, rngOf(seed)).slice(0, 3);
  const mixed = shuffle([correct, ...picked], rngOf(`${seed}:mix`));
  return mixed as Quad;
}

function answerOf(options: Quad, correct: string): number {
  return options.indexOf(correct);
}

const FRAMES = 18;

function pieceTitle(piece: Piece): string {
  if (piece.kind === "god" || piece.kind === "king") return `تمثال ${piece.name}`;
  return piece.name;
}

const FIELD_ASK: Record<keyof typeof FIELD_LABEL, ((title: string) => string)[]> = {
  material: [
    (title) => `ما هي خامة ${title}؟`,
    (title) => `ما المادة التي صُنع منها ${title}؟`,
    (title) => `من أي خامة صُنع ${title}؟`,
  ],
  period: [
    (title) => `إلى أي عصر ينتمي ${title}؟`,
    (title) => `ما العصر الذي يرجع إليه ${title}؟`,
    (title) => `في أي فترة زمنية ظهر ${title}؟`,
  ],
  place: [
    (title) => `أين يقع ${title}؟`,
    (title) => `ما الموقع المرتبط بـ${title}؟`,
    (title) => `أين اكتُشف ${title} أو أُقيم؟`,
  ],
  museum: [
    (title) => `أين يُحفظ ${title}؟`,
    (title) => `ما مكان حفظ ${title}؟`,
    (title) => `في أي متحف أو موقع يُحفظ ${title}؟`,
  ],
  culture: [],
};

function fieldValue(piece: Piece, field: "period" | "material" | "place" | "museum" | "culture"): string {
  if (field === "culture") return CULTURE_NAME[piece.culture];
  return piece[field];
}

const FIELD_LABEL = {
  period: "العصر",
  material: "الخامة",
  place: "مكان الاكتشاف أو البناء",
  museum: "مكان الحفظ",
  culture: "الحضارة",
} as const;

function buildField(piece: Piece, field: keyof typeof FIELD_LABEL, frame: number): Ask | null {
  if (field === "culture") return null;
  const correct = fieldValue(piece, field);
  if (!correct || correct === "—" || correct === "متفرق" || correct === "مفقود") return null;
  const seed = `${piece.id}:${field}:${frame}`;
  const pool = PIECES.map((item) => fieldValue(item, field));
  const options = quad(correct, pool, seed);
  if (!options) return null;
  const forms = FIELD_ASK[field];
  const title = pieceTitle(piece);
  return {
    id: seed,
    fact: `${piece.id}:${field}`,
    stem: forms[frame % forms.length]?.(title) ?? `ما هي ${FIELD_LABEL[field]} ${title}؟`,
    options,
    answer: answerOf(options, correct),
    topic: "piece",
    pieceId: piece.id,
    glyphs: null,
    hard: false,
  };
}

function buildWho(piece: Piece, frame: number): Ask | null {
  const seed = `${piece.id}:who:${frame}`;
  const options = quad(
    piece.name,
    PIECES.map((item) => item.name),
    seed,
  );
  if (!options) return null;
  const stems = [
    `ما الأثر الذي يصدُق عليه هذا الوصف؟ ${piece.blurb}`,
    `إلى أي أثر يشير الوصف الآتي؟ ${piece.blurb}`,
    `ما الاسم الذي يطابقه الوصف الآتي؟ ${piece.blurb}`,
  ];
  return {
    id: seed,
    fact: `${piece.id}:who`,
    stem: stems[frame] ?? stems[0] ?? piece.blurb,
    options,
    answer: answerOf(options, piece.name),
    topic: "piece",
    pieceId: piece.id,
    glyphs: null,
    hard: false,
  };
}

type Fixed = {
  id: string;
  stem: string;
  options: Quad;
  answer: number;
  glyphs?: string;
  topic: Topic;
  hard?: boolean;
};

const FIXED: Fixed[] = [
  {
    id: "cur-manetho",
    topic: "curriculum",
    hard: true,
    stem: "مانيتون قسم التاريخ المصري لكام أسرة؟",
    options: ["١٢", "١٨", "٣٠", "٤٢"],
    answer: 2,
  },
  {
    id: "cur-manetho-who",
    topic: "curriculum",
    hard: true,
    stem: "ما وظيفة مانيتون؟",
    options: ["كاهن في عهد بطليموس الثاني", "مؤرخ روماني زار مصر", "مهندس هرم زوسر", "مكتشف حجر رشيد"],
    answer: 0,
  },
  {
    id: "cur-turin",
    topic: "curriculum",
    hard: true,
    stem: "بأي خط كُتبت بردية تورين، وفي أي عصر تقريبًا؟",
    options: ["ديموطيقي في العصر البطلمي", "هيراطيقي في عصر رمسيس الثاني", "يوناني في عصر الإسكندر", "قبطي في العصر الروماني"],
    answer: 1,
  },
  {
    id: "cur-turin-start",
    topic: "curriculum",
    hard: true,
    stem: "بمَ تبدأ قائمة تورين؟",
    options: ["نعرمر مباشرة", "عصر الآلهة", "الهكسوس", "الإسكندر"],
    answer: 1,
  },
  {
    id: "cur-palermo",
    topic: "curriculum",
    hard: true,
    stem: "ما خامة حجر باليرمو، وعند أي ملك تتوقف قائمته؟",
    options: ["جرانيت حتى خوفو", "بازلت حتى نفر إير كارع", "رمال حتى زوسر", "خشب حتى أحمس"],
    answer: 1,
  },
  {
    id: "cur-palermo-parts",
    topic: "curriculum",
    hard: true,
    stem: "أجزاء حجر باليرمو المعروفة حوالي كام؟",
    options: ["٣", "٧", "١٢", "٣٠"],
    answer: 1,
  },
  {
    id: "cur-lists",
    topic: "curriculum",
    hard: true,
    stem: "قائمة أبيدوس فيها حوالي كام ملك؟",
    options: ["٣٠", "٥٨", "٦١", "٧٦"],
    answer: 3,
  },
  {
    id: "cur-saqqara-list",
    topic: "curriculum",
    hard: true,
    stem: "قائمة سقارة (تنري) بتبدأ الملوك تقريبًا من مين؟",
    options: ["من نعرمر", "من عج إب", "من خوفو", "من أحمس"],
    answer: 1,
  },
  {
    id: "cur-karnak-list",
    topic: "curriculum",
    hard: true,
    stem: "كم اسمًا تتضمنه تقريبًا قائمة الكرنك الخاصة بتحتمس الثالث؟",
    options: ["٣٠", "٦١", "٧٦", "١٢٠"],
    answer: 1,
  },
  {
    id: "cur-rosetta",
    topic: "curriculum",
    hard: true,
    stem: "ما خامة حجر رشيد، وكم خطًا كُتب به؟",
    options: ["بازلت وخطين", "جرانوديوريت و٣ خطوط", "رخام و٤ خطوط", "خشب وخط واحد"],
    answer: 1,
  },
  {
    id: "cur-champollion",
    topic: "curriculum",
    hard: true,
    stem: "مين اللي فك رموز حجر رشيد؟",
    options: ["هوارد كارتر", "شامبليون", "فلندرز بيتري", "دريير"],
    answer: 1,
  },
  {
    id: "cur-rosetta-king",
    topic: "curriculum",
    hard: true,
    stem: "باسم أي ملك صدر مرسوم رشيد؟",
    options: ["بطلميوس الخامس", "الإسكندر", "كليوباترا السابعة بس", "رمسيس الثاني"],
    answer: 0,
  },
  {
    id: "cur-djoser-size",
    topic: "curriculum",
    hard: true,
    stem: "سور مجموعة زوسر طوله من الشمال للجنوب حوالي كام؟",
    options: ["٥٤٥ متر", "٢٧٧ متر", "١٠٠ متر", "١٤٦ متر"],
    answer: 0,
  },
  {
    id: "cur-djoser-width",
    topic: "curriculum",
    hard: true,
    stem: "عرض سور زوسر من الشرق للغرب حوالي كام؟",
    options: ["٥٤٥ متر", "٢٧٧ متر", "١٠ أمتار", "٦٠ متر"],
    answer: 1,
  },
  {
    id: "cur-djoser-gates",
    topic: "curriculum",
    hard: true,
    stem: "مداخل سور زوسر كام، وفين الحقيقي؟",
    options: ["١٤ منها واحد حقيقي جنوب شرق", "٤ كلها حقيقية", "١٢ من غير مدخل", "مدخل واحد شمال"],
    answer: 0,
  },
  {
    id: "cur-djoser-door",
    topic: "curriculum",
    hard: true,
    stem: "ليه المدخل الحقيقي في مجموعة زوسر من غير باب خشب؟",
    options: ["عشان الحجر أرخص", "لأن رع يدخل ويخرج من غير باب", "الباب اتسرق", "كان لسه بيتبنى"],
    answer: 1,
  },
  {
    id: "cur-imhotep",
    topic: "curriculum",
    hard: true,
    stem: "مهندس مجموعة زوسر؟",
    options: ["سننموت", "إمحوتب", "أمنحتب بن حابو", "حم إيونو"],
    answer: 1,
  },
  {
    id: "cur-djoser-stone",
    topic: "curriculum",
    hard: true,
    stem: "من أي حجر صُنع الكساء الخارجي لمجموعة زوسر؟",
    options: ["جرانيت أسوان", "حجر طرة الجيري", "بازلت", "ألباستر"],
    answer: 1,
  },
  {
    id: "cur-serekh",
    topic: "curriculum",
    hard: true,
    stem: "على أي هيئة صُمّم سور زوسر؟",
    options: ["عمود دوري", "واجهة قصر السرخ، دخلات وخرجات", "قبة", "هرم أملس من الأول"],
    answer: 1,
  },
  {
    id: "cur-aha",
    topic: "curriculum",
    hard: true,
    stem: "ما رقم مقبرة حور عحا في سقارة، وكم مخزنًا تضم؟",
    options: ["٣٣٥٧ وفيها ٢٧ مخزن", "٣٥٠٥ وفيها ٣ مخازن", "يو-جي وفيها ٧", "١٠٠ وفيها ١٢"],
    answer: 0,
  },
  {
    id: "cur-den",
    topic: "curriculum",
    hard: true,
    stem: "من أي جهة ينزل درج دن في سقارة؟",
    options: ["الشمال", "الشرق", "الغرب", "من السقف"],
    answer: 1,
  },
  {
    id: "cur-den-abydos",
    topic: "curriculum",
    hard: true,
    stem: "بمَ بُلطت أرضية حجرة دفن دن في أبيدوس لأول مرة؟",
    options: ["ذهب", "جرانيت أحمر", "خشب أرز", "فيانس أزرق"],
    answer: 1,
  },
  {
    id: "cur-adjib",
    topic: "curriculum",
    hard: true,
    stem: "مصطبة عج إب اتبنت على كام مرحلة؟",
    options: ["مرحلة واحدة", "٣ مراحل", "٦ مراحل", "١٢ مرحلة"],
    answer: 1,
  },
  {
    id: "cur-qaa",
    topic: "curriculum",
    hard: true,
    stem: "ما الجديد في مقبرة قاعا ٣٥٠٥ بسقارة؟",
    options: ["أول هرم أملس", "أول معبد جنائزي في الناحية الشمالية", "أول مسلة", "أول قبة"],
    answer: 1,
  },
  {
    id: "cur-omari",
    topic: "curriculum",
    hard: true,
    stem: "دفنة العمري رقم ٣٥أ: الرأس والوجه رايحين فين؟",
    options: ["الرأس شمال والوجه شرق", "الرأس جنوب والوجه غرب", "واقف", "ممدد للشرق"],
    answer: 1,
  },
  {
    id: "cur-tomb100",
    topic: "curriculum",
    hard: true,
    stem: "بمَ اشتُهرت مقبرة ١٠٠ في هيراكونبوليس؟",
    options: ["أول هرم", "رسم الزعيم وهو بيضرب الأعداء", "قناع توت", "حجر رشيد"],
    answer: 1,
  },
  {
    id: "cur-uj",
    topic: "curriculum",
    hard: true,
    stem: "مقبرة يو-جي في أبيدوس اكتشفها مين؟",
    options: ["كارتر ١٩٢٢", "دريير ١٩٨٨", "ماريت ١٨٥٠", "بورخارت ١٩١٢"],
    answer: 1,
  },
  {
    id: "cur-lomekwi",
    topic: "curriculum",
    hard: true,
    stem: "صناعة لوميكوي ٣ عمرها حوالي كام، وفين؟",
    options: ["٣٫٣ مليون سنة في كينيا", "٥٠٠٠ سنة في مصر", "٤٠ ألف في فرنسا", "مليون في الصين"],
    answer: 0,
  },
  {
    id: "cur-stone-age",
    topic: "curriculum",
    hard: true,
    stem: "متى انتهت العصور الحجرية تقريبًا؟",
    options: ["عند اختراع الكتابة حوالي ٥٠٠٠ ق.م", "عند بناء الهرم", "عند فتح مصر", "عند الإسلام"],
    answer: 0,
  },
  {
    id: "cur-stone-name",
    topic: "curriculum",
    hard: true,
    stem: "ليه اتسمت العصور الحجرية كده؟",
    options: ["لأن الناس كانت بتاكل حجر", "لأن الحجر هو اللي فضل من أدواتهم", "لأن البيوت كلها حجر", "لأن الكتابة على حجر"],
    answer: 1,
  },
  {
    id: "cur-geo",
    topic: "curriculum",
    hard: true,
    stem: "ما معنى مقطعي كلمة جيولوجيا في اليونانية؟",
    options: ["ماء + نار", "أرض + علم", "سماء + قياس", "حجر + ملك"],
    answer: 1,
  },
  {
    id: "cur-earth-age",
    topic: "curriculum",
    hard: true,
    stem: "كم يبلغ عمر الأرض تقريبًا بالقياس الإشعاعي؟",
    options: ["٣٫٥ مليون سنة", "٦٠٠٠ سنة", "٤٫٦ مليار سنة", "١٠٠ مليار سنة"],
    answer: 2,
  },
  {
    id: "cur-salt-age",
    topic: "curriculum",
    hard: true,
    stem: "كم بلغ تقدير عمر الأرض بطريقة ملوحة البحار؟",
    options: ["٤٫٦ مليار", "٣٫٥ مليون سنة بس", "٥٠٠٠ سنة", "نفس الإشعاع"],
    answer: 1,
  },
  {
    id: "cur-life",
    topic: "curriculum",
    hard: true,
    stem: "متى بدأت الحياة الظاهرة على سطح الأرض تقريبًا؟",
    options: ["٦٠٠ مليون سنة", "٤٫٦ مليار من أول يوم", "٥٠٠٠ ق.م", "عصر الأسرات"],
    answer: 0,
  },
  {
    id: "cur-civ",
    topic: "curriculum",
    hard: true,
    stem: "ما طرفا معادلة الحضارة؟",
    options: ["ذهب + حجر", "عوامل طبيعية + عوامل بشرية", "حرب + معبد بس", "كتابة + جيش بس"],
    answer: 1,
  },
  {
    id: "cur-basem",
    topic: "curriculum",
    hard: true,
    stem: "ما المحرّك الأساسي لعمارة المصري القديم وخريطته؟",
    options: ["التجارة بس", "الفكر الديني", "القانون الروماني", "الخط اليوناني"],
    answer: 1,
  },
  {
    id: "cur-eye",
    topic: "curriculum",
    hard: true,
    stem: "كسور عين حورس الستة مجموعها كام؟",
    options: ["١/٢", "٣/٤", "٧/٨", "٦٣/٦٤"],
    answer: 3,
  },
  {
    id: "cur-tut-weight",
    topic: "curriculum",
    hard: true,
    stem: "قناع توت عنخ آمون وزنه تقريبًا كام؟",
    options: ["حوالي كيلو", "حوالي ١٠ كيلو", "حوالي ٤٠ كيلو", "أكتر من ١٠٠ كيلو"],
    answer: 1,
  },
  {
    id: "cur-nefertiti-find",
    topic: "curriculum",
    hard: true,
    stem: "رأس نفرتيتي لقاه مين؟",
    options: ["هوارد كارتر", "لودفيج بورخارت", "بتري", "ماريت"],
    answer: 1,
  },
  {
    id: "cur-senenmut",
    topic: "curriculum",
    hard: true,
    stem: "مهندس معبد حتشبسوت في الدير البحري؟",
    options: ["إمحوتب", "سننموت", "حم إيونو", "حور محب"],
    answer: 1,
  },
  {
    id: "hiero-ayin",
    topic: "hiero",
    hard: true,
    glyphs: "𓂝",
    stem: "ما المقطع الصوتي اللاتيني لهذه العلامة؟",
    options: ["ꜥ", "ꜣ", "ḫ", "š"],
    answer: 0,
  },
  {
    id: "hiero-aleph",
    topic: "hiero",
    hard: true,
    glyphs: "𓄿",
    stem: "المقطع الصوتي للعلامة دي؟ الألف الخفيفة مش العين.",
    options: ["ꜣ", "ꜥ", "ḥ", "ḫ"],
    answer: 0,
  },
  {
    id: "hiero-kh",
    topic: "hiero",
    hard: true,
    glyphs: "𓐍",
    stem: "خ في النطق العلمي بتكتب إزاي؟ مش x.",
    options: ["ḫ", "x", "š", "ḥ"],
    answer: 0,
  },
  {
    id: "hiero-hdot",
    topic: "hiero",
    hard: true,
    glyphs: "𓎛",
    stem: "ح (هاء تحتها نقطة) للعلامة دي؟",
    options: ["ḥ", "ḫ", "h", "ẖ"],
    answer: 0,
  },
  {
    id: "hiero-shy",
    topic: "hiero",
    hard: true,
    glyphs: "𓄡",
    stem: "صوت البطن 𓄡 في اللاتيني؟",
    options: ["ẖ", "ḫ", "ḥ", "š"],
    answer: 0,
  },
  {
    id: "hiero-shin",
    topic: "hiero",
    hard: true,
    glyphs: "𓈙",
    stem: "المقطع الصوتي للعلامة دي؟",
    options: ["š", "s", "ḫ", "ṯ"],
    answer: 0,
  },
  {
    id: "hiero-dj",
    topic: "hiero",
    hard: true,
    glyphs: "𓆓",
    stem: "صوت الثعبان دي في اللاتيني؟",
    options: ["ḏ", "d", "ṯ", "z"],
    answer: 0,
  },
  {
    id: "hiero-tj",
    topic: "hiero",
    hard: true,
    glyphs: "𓍿",
    stem: "صوت الحبل دي؟",
    options: ["ṯ", "t", "ḏ", "č"],
    answer: 0,
  },
  {
    id: "hiero-jnk",
    topic: "hiero",
    hard: true,
    glyphs: "𓇋𓈖𓎡 𓊹",
    stem: "ترجمة الجملة كلها؟",
    options: ["أنا المعبود", "هو البيت", "يا رع", "ذهب الملك"],
    answer: 0,
  },
  {
    id: "hiero-jnk-tl",
    topic: "hiero",
    hard: true,
    glyphs: "𓇋𓈖𓎡 𓊹",
    stem: "المقاطع الصوتية للجملة؟",
    options: ["jnk nṯr", "nts nbw", "iw n.k pr", "pꜣy.i pr"],
    answer: 0,
  },
  {
    id: "hiero-jnk-w",
    topic: "hiero",
    hard: true,
    glyphs: "𓇋𓈖𓎡 𓊹",
    stem: "ما المقطع الصوتي للكلمة الأولى فقط؟",
    options: ["jnk", "nṯr", "pr", "nbw"],
    answer: 0,
  },
  {
    id: "hiero-jnk-g",
    topic: "hiero",
    hard: true,
    glyphs: "𓇋𓈖𓎡 𓊹",
    stem: "إعراب الجملة؟",
    options: ["ضمير مستقل مبتدأ + خبر اسم", "جملة فعلية", "نداء بس", "إضافة مباشرة من غير خبر"],
    answer: 0,
  },
  {
    id: "hiero-nts",
    topic: "hiero",
    hard: true,
    glyphs: "𓈖𓏏𓋴 𓎟𓏏 𓋞",
    stem: "ترجمة الجملة؟",
    options: ["هي صاحبة الذهب", "أنا المعبود", "قاربي", "إن لهم قارب"],
    answer: 0,
  },
  {
    id: "hiero-nts-tl",
    topic: "hiero",
    hard: true,
    glyphs: "𓈖𓏏𓋴 𓎟𓏏 𓋞",
    stem: "المقاطع؟ العين والذهب من غير حرف x.",
    options: ["nts nbt nbw", "jnk nṯr", "dpt mwt nn", "hy rꜥ jnk ntk"],
    answer: 0,
  },
  {
    id: "hiero-nts-w",
    topic: "hiero",
    hard: true,
    glyphs: "𓈖𓏏𓋴 𓎟𓏏 𓋞",
    stem: "أول كلمة: مقطعها ومعناها؟",
    options: ["nts = هي", "nbw = ذهب", "pr = بيت", "jnk = أنا"],
    answer: 0,
  },
  {
    id: "hiero-death",
    topic: "hiero",
    hard: true,
    glyphs: "𓂧𓊪𓏏 𓅓𓏏𓀐 𓈖𓈖",
    stem: "ترجمة الجملة؟",
    options: ["دي طعم الموت", "هي صاحبة الذهب", "يا رع أنا أنت", "بيتي"],
    answer: 0,
  },
  {
    id: "hiero-death-tl",
    topic: "hiero",
    hard: true,
    glyphs: "𓂧𓊪𓏏 𓅓𓏏𓀐 𓈖𓈖",
    stem: "مقاطع جملة «دي طعم الموت»؟",
    options: ["dpt mwt nn", "nts nbt nbw", "pꜣy.i pr", "iw n.k pr pn"],
    answer: 0,
  },
  {
    id: "hiero-death-g",
    topic: "hiero",
    hard: true,
    glyphs: "𓂧𓊪𓏏 𓅓𓏏𓀐 𓈖𓈖",
    stem: "إعراب dpt mwt nn؟",
    options: [
      "dpt mwt مضاف ومضاف إليه مبتدأ، و nn خبر إشارة",
      "فعل ماض وفاعل",
      "نداء فقط",
      "أسلوب ملكية ny",
    ],
    answer: 0,
  },
  {
    id: "hiero-hy",
    topic: "hiero",
    hard: true,
    glyphs: "𓉔𓇋 𓇳 𓇋𓈖𓎡 𓈖𓏏𓎡",
    stem: "ترجمة الجملة؟",
    options: ["يا رع، أنا أنت", "دي طعم الموت", "قاربي", "ابنتك"],
    answer: 0,
  },
  {
    id: "hiero-hy-tl",
    topic: "hiero",
    hard: true,
    glyphs: "𓉔𓇋 𓇳 𓇋𓈖𓎡 𓈖𓏏𓎡",
    stem: "المقاطع؟ رع بالعين العلمية ꜥ مش c.",
    options: ["hy rꜥ jnk ntk", "hy ra ink ntk", "dpt mwt nn", "n(y) sw pr"],
    answer: 0,
  },
  {
    id: "hiero-hy-w",
    topic: "hiero",
    hard: true,
    glyphs: "𓉔𓇋 𓇳 𓇋𓈖𓎡 𓈖𓏏𓎡",
    stem: "أول كلمة في الجملة دي؟",
    options: ["hy نداء", "rꜥ رع", "jnk أنا", "ntk أنت"],
    answer: 0,
  },
  {
    id: "hiero-ankh",
    topic: "hiero",
    hard: true,
    glyphs: "𓋹𓍑𓋴",
    stem: "ما معنى صيغة الملوك هذه؟",
    options: ["حياة، سلامة، صحة", "بيت، ذهب، ماء", "أنا، أنت، هو", "شمال، جنوب، شرق"],
    answer: 0,
  },
  {
    id: "hiero-ankh-tl",
    topic: "hiero",
    hard: true,
    glyphs: "𓋹𓍑𓋴",
    stem: "مقاطع الصيغة؟ العين في أول كلمة.",
    options: ["ꜥnḫ wḏꜣ snb", "ankh wedja seneb بالحروف الإنجليزية بس", "jnk nṯr", "pr n.i"],
    answer: 0,
  },
  {
    id: "hiero-pr",
    topic: "hiero",
    hard: true,
    glyphs: "𓉐",
    stem: "العلامة دي لوحدها؟",
    options: ["pr = بيت", "nbw = ذهب", "nṯr = معبود", "mw = ماء"],
    answer: 0,
  },
  {
    id: "hiero-nbw",
    topic: "hiero",
    hard: true,
    glyphs: "𓋞",
    stem: "ياقة الذهب دي؟",
    options: ["nbw = ذهب", "pr = بيت", "ḥtp = قربان", "nsw = ملك"],
    answer: 0,
  },
  {
    id: "hiero-nsw",
    topic: "hiero",
    hard: true,
    glyphs: "𓇓",
    stem: "نبات السعادى ده في الألقاب؟",
    options: ["nsw = ملك", "nṯr = معبود", "sn = أخ", "sꜣ = ابن"],
    answer: 0,
  },
  {
    id: "hiero-style2",
    topic: "hiero",
    hard: true,
    stem: "pꜣy.i pr أسلوب ملكية رقم كام، ومعناه؟",
    options: ["الأسلوب ٢: بيتي", "الأسلوب ٤: قاربي", "فعل أمر", "جملة نفي"],
    answer: 0,
  },
  {
    id: "hiero-style2b",
    topic: "hiero",
    hard: true,
    stem: "tꜣy.k sꜣt معناها؟ والتاء للمؤنث.",
    options: ["ابنتك", "بيتي", "ذهبها", "هو البيت"],
    answer: 0,
  },
  {
    id: "hiero-style3",
    topic: "hiero",
    hard: true,
    stem: "dpt n.i imy في ملف الملكية معناها؟",
    options: ["قاربي", "بيتكم", "والدكم", "أنا حمار"],
    answer: 0,
  },
  {
    id: "hiero-style3b",
    topic: "hiero",
    hard: true,
    stem: "pr n.tn imy ؟",
    options: ["بيتكم", "قاربي", "بيتها", "نداء رع"],
    answer: 0,
  },
  {
    id: "hiero-style4",
    topic: "hiero",
    hard: true,
    stem: "n(y) sw pr بتتقرأ إزاي في المنهج؟",
    options: ["ينتمي له بيت، يعني بيته", "يا رع", "فعل ماض", "نفي"],
    answer: 0,
  },
  {
    id: "hiero-style4b",
    topic: "hiero",
    hard: true,
    stem: "n(y) tn jt ؟",
    options: ["والدكم", "بيتك", "قاربهم", "أنا المعبود"],
    answer: 0,
  },
  {
    id: "hiero-style5",
    topic: "hiero",
    hard: true,
    stem: "iw n.k pr pn معناها؟",
    options: ["إن لك هذا البيت", "هي صاحبة الذهب", "دي طعم الموت", "ابنتك"],
    answer: 0,
  },
  {
    id: "hiero-style5b",
    topic: "hiero",
    hard: true,
    stem: "iw n.sn dpt ؟",
    options: ["إن لهم قارب / قاربهم", "بيتي", "يا رع أنا أنت", "ذهب الملك"],
    answer: 0,
  },
  {
    id: "hiero-style6",
    topic: "hiero",
    hard: true,
    stem: "jnk ꜥꜣ في الأسلوب ٦، والعين ꜥ مش c، والألف ꜣ مش x. المعنى؟",
    options: ["أنا حمار، صفة ملكية", "هو بيت", "قاربي", "حياة وسلامة"],
    answer: 0,
  },
  {
    id: "hiero-style6b",
    topic: "hiero",
    hard: true,
    stem: "ntf pr في الأسلوب ٦؟",
    options: ["هو بيت، يعني بيته", "أنا المعبود", "نداء", "جمع مؤنث"],
    answer: 0,
  },
  {
    id: "hiero-p3-from",
    topic: "hiero",
    hard: true,
    stem: "من أي أصل اشتُقّت صفات الملكية pꜣy و tꜣy و nꜣy؟",
    options: ["من أسماء الإشارة pꜣ tꜣ nꜣ بإضافة y", "من أدوات الجر بس", "من الأفعال", "من الأرقام"],
    answer: 0,
  },
];

function fixedAsks(): Ask[] {
  return FIXED.map((item) => ({
    id: item.id,
    fact: item.id,
    stem: item.stem,
    options: item.options,
    answer: item.answer,
    topic: item.topic,
    pieceId: null,
    glyphs: item.glyphs ?? null,
    hard: item.hard ?? true,
  }));
}

let cache: Ask[] | null = null;

export function questionPool(): Ask[] {
  if (cache) return cache;
  const built: Ask[] = [];
  for (const piece of PIECES) {
    for (let frame = 0; frame < FRAMES; frame += 1) {
      for (const field of Object.keys(FIELD_LABEL) as (keyof typeof FIELD_LABEL)[]) {
        const ask = buildField(piece, field, frame);
        if (ask) built.push(ask);
      }
      const who = buildWho(piece, frame);
      if (who) built.push(who);
    }
  }
  built.push(...fixedAsks());
  cache = built;
  return built;
}

export function poolSize(): number {
  return questionPool().length;
}

const HIERO_EASY = [
  "hiero-ayin",
  "hiero-aleph",
  "hiero-kh",
  "hiero-hdot",
  "hiero-shy",
  "hiero-shin",
  "hiero-dj",
  "hiero-tj",
  "hiero-pr",
  "hiero-nbw",
  "hiero-nsw",
  "hiero-ankh",
];
const HIERO_MID = [
  "hiero-jnk",
  "hiero-jnk-w",
  "hiero-nts",
  "hiero-nts-w",
  "hiero-death",
  "hiero-hy",
  "hiero-hy-w",
  "hiero-ankh-tl",
  "hiero-style2",
  "hiero-style2b",
];
const HIERO_HARD = [
  "hiero-jnk-tl",
  "hiero-jnk-g",
  "hiero-nts-tl",
  "hiero-death-tl",
  "hiero-death-g",
  "hiero-hy-tl",
  "hiero-style3",
  "hiero-style3b",
  "hiero-style4",
  "hiero-style4b",
  "hiero-style5",
  "hiero-style5b",
  "hiero-style6",
  "hiero-style6b",
  "hiero-p3-from",
];

export function hieroRank(id: string): "easy" | "mid" | "hard" | null {
  if (HIERO_EASY.includes(id)) return "easy";
  if (HIERO_MID.includes(id)) return "mid";
  if (HIERO_HARD.includes(id)) return "hard";
  return null;
}

export function hieroIds(rank: "easy" | "mid" | "hard"): string[] {
  if (rank === "easy") return HIERO_EASY;
  if (rank === "mid") return HIERO_MID;
  return HIERO_HARD;
}

const STAKE: Ask[] = [
  {
    id: "stake-jnk-role",
    fact: "stake-jnk-role",
    stem: "ما إعراب 𓇋𓈖𓎡 في هذه الجملة؟",
    options: ["ضمير مستقل في محل مبتدأ", "فعل ماضٍ", "مفعول به", "أداة نداء"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓇋𓈖𓎡 𓊹",
    hard: true,
  },
  {
    id: "stake-jnk-kind",
    fact: "stake-jnk-kind",
    stem: "الجملة 𓇋𓈖𓎡 𓊹 عبارة عن أي نوع؟",
    options: ["جملة اسمية خبرها اسم", "جملة فعلية", "جملة اسمية ذات خبر وصفي", "جملة نفي"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓇋𓈖𓎡 𓊹",
    hard: true,
  },
  {
    id: "stake-aa-kind",
    fact: "stake-aa-kind",
    stem: "الجملة 𓇋𓈖𓎡 𓁹𓄿 عبارة عن أي نوع؟",
    options: ["جملة اسمية ذات خبر وصفي", "جملة فعلية", "جملة اسمية خبرها اسم", "جملة نفي"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓇋𓈖𓎡 𓁹𓄿",
    hard: true,
  },
  {
    id: "stake-aa-role",
    fact: "stake-aa-role",
    stem: "ما إعراب 𓁹𓄿 في الجملة؟",
    options: ["خبر وصفي", "مبتدأ", "فعل", "أداة نداء"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓇋𓈖𓎡 𓁹𓄿",
    hard: true,
  },
  {
    id: "stake-nts-role",
    fact: "stake-nts-role",
    stem: "ما إعراب 𓈖𓏏𓋴 في الجملة؟",
    options: ["ضمير مستقل مؤنث في محل مبتدأ", "خبر وصفي", "فعل ماضٍ", "مضاف إليه"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓈖𓏏𓋴 𓎟𓏏 𓋞",
    hard: true,
  },
  {
    id: "stake-nbt-role",
    fact: "stake-nbt-role",
    stem: "ما إعراب 𓎟𓏏 في الجملة؟",
    options: ["خبر، نعت نسبي بمعنى صاحبة", "فعل", "أداة نفي", "مبتدأ ضمير"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓈖𓏏𓋴 𓎟𓏏 𓋞",
    hard: true,
  },
  {
    id: "stake-nn-role",
    fact: "stake-nn-role",
    stem: "ما إعراب 𓈖𓈖 في الجملة؟",
    options: ["خبر، اسم إشارة", "مبتدأ", "فعل", "أداة نداء"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓂧𓊪𓏏 𓅓𓏏𓀐 𓈖𓈖",
    hard: true,
  },
  {
    id: "stake-mwt-role",
    fact: "stake-mwt-role",
    stem: "ما إعراب 𓅓𓏏𓀐 في الجملة؟",
    options: ["مضاف إليه", "فعل ماضٍ", "خبر وصفي", "أداة نداء"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓂧𓊪𓏏 𓅓𓏏𓀐 𓈖𓈖",
    hard: true,
  },
  {
    id: "stake-dpt-kind",
    fact: "stake-dpt-kind",
    stem: "الجملة 𓂧𓊪𓏏 𓅓𓏏𓀐 𓈖𓈖 عبارة عن أي نوع؟",
    options: ["جملة اسمية: مبتدأ مضاف وخبر إشارة", "جملة فعلية", "جملة اسمية ذات خبر وصفي", "جملة نفي"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓂧𓊪𓏏 𓅓𓏏𓀐 𓈖𓈖",
    hard: true,
  },
  {
    id: "stake-ny-role",
    fact: "stake-ny-role",
    stem: "ما إعراب 𓋴𓅱 في n(y) sw pr؟",
    options: ["مبتدأ، ضمير تابع مؤخَّر", "فعل", "أداة نداء", "مفعول به"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓈖 𓋴𓅱 𓉐",
    hard: true,
  },
  {
    id: "stake-ny-kind",
    fact: "stake-ny-kind",
    stem: "n(y) sw pr عبارة عن أي نوع؟",
    options: ["جملة اسمية خبرها صفة ملكية مقدَّمة", "جملة فعلية", "جملة نفي", "نداء فقط"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓈖 𓋴𓅱 𓉐",
    hard: true,
  },
  {
    id: "stake-iw-role",
    fact: "stake-iw-role",
    stem: "ما إعراب 𓈖𓎡 في الجملة؟",
    options: ["حرف n مع ضمير الكاف", "فعل ماضٍ", "خبر وصفي", "أداة نداء"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓇋𓅱 𓈖𓎡 𓉐 𓊪𓈖",
    hard: true,
  },
  {
    id: "stake-iw-kind",
    fact: "stake-iw-kind",
    stem: "الجملة 𓇋𓅱 𓈖𓎡 𓉐 𓊪𓈖 عبارة عن أي نوع؟",
    options: ["جملة iw ظرفية، والمبتدأ مؤخَّر", "جملة فعلية sḏm.n.f", "جملة اسمية ذات خبر وصفي", "جملة نفي"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓇋𓅱 𓈖𓎡 𓉐 𓊪𓈖",
    hard: true,
  },
  {
    id: "stake-pay-role",
    fact: "stake-pay-role",
    stem: "ما إعراب 𓅮𓄿𓇋𓀀 قبل الاسم؟",
    options: ["نعت ملكي إشاري يسبق الموصوف", "فعل ماضٍ", "ضمير مستقل مبتدأ", "أداة نفي"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓅮𓄿𓇋𓀀 𓉐",
    hard: true,
  },
  {
    id: "stake-ni-role",
    fact: "stake-ni-role",
    stem: "ما إعراب 𓈖𓀀 في 𓉐 𓈖𓀀؟",
    options: ["حرف n مع ضمير، في محل مضاف إليه", "فعل", "خبر وصفي", "أداة نداء"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓉐 𓈖𓀀",
    hard: true,
  },
  {
    id: "stake-hy-role",
    fact: "stake-hy-role",
    stem: "ما إعراب 𓉔𓇋 في الجملة؟",
    options: ["أداة نداء", "ضمير مستقل مبتدأ", "فعل ماضٍ", "خبر وصفي"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓉔𓇋 𓇳",
    hard: true,
  },
  {
    id: "stake-ntf-kind",
    fact: "stake-ntf-kind",
    stem: "الجملة 𓈖𓏏𓆑 𓉐 عبارة عن أي نوع؟",
    options: ["جملة اسمية خبرها اسم", "جملة فعلية", "جملة اسمية ذات خبر وصفي", "نداء فقط"],
    answer: 0,
    topic: "hiero",
    pieceId: null,
    glyphs: "𓈖𓏏𓆑 𓉐",
    hard: true,
  },
];

export function pickStakeAsk(opts: { rng: () => number; usedIds: string[] }): Ask {
  const fresh = STAKE.filter((ask) => !opts.usedIds.includes(ask.id));
  const list = fresh.length > 0 ? fresh : STAKE;
  return list[Math.floor(opts.rng() * list.length)] ?? list[0]!;
}

export type UsedBook = { ids: string[]; facts: string[] };

export function loadUsed(): UsedBook {
  if (typeof localStorage === "undefined") return { ids: [], facts: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Partial<UsedBook>;
    return {
      ids: Array.isArray(raw.ids) ? raw.ids.filter((item) => typeof item === "string") : [],
      facts: Array.isArray(raw.facts) ? raw.facts.filter((item) => typeof item === "string") : [],
    };
  } catch {
    return { ids: [], facts: [] };
  }
}

export function saveUsed(used: UsedBook) {
  if (typeof localStorage === "undefined") return;
  const next = { ids: used.ids.slice(-9000), facts: used.facts.slice(-9000) };
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
}

export function noteAsked(ask: Ask | null | undefined) {
  if (!ask?.id) return;
  const used = loadUsed();
  used.ids.push(ask.id);
  used.facts.push(ask.fact);
  saveUsed(used);
}

function candidates(opts: {
  pieceId?: string;
  topic?: Topic | "any";
  ignore?: boolean;
  usedIds: Set<string>;
  usedFacts: Set<string>;
}): Ask[] {
  return questionPool().filter((ask) => {
    if (opts.pieceId && ask.pieceId !== opts.pieceId) return false;
    if (opts.topic && opts.topic !== "any" && ask.topic !== opts.topic) return false;
    if (opts.ignore) return true;
    if (opts.usedIds.has(ask.id) || opts.usedFacts.has(ask.fact)) return false;
    return true;
  });
}

export function pickAsk(opts: {
  rng: () => number;
  usedIds: string[];
  usedFacts: string[];
  pieceId?: string;
  topic?: Topic | "any";
  avoidPiece?: string;
  question?: boolean;
}): Ask {
  const usedIds = new Set(opts.usedIds);
  const usedFacts = new Set(opts.usedFacts);
  const keep = (items: Ask[]) => {
    if (!opts.question) return items;
    const next = items.filter((ask) => !ask.fact.endsWith(":who"));
    return next.length > 0 ? next : items;
  };
  let list = keep(candidates({ ...opts, usedIds, usedFacts }));
  if (opts.avoidPiece) {
    const narrowed = list.filter((ask) => ask.pieceId !== opts.avoidPiece);
    if (narrowed.length > 0) list = narrowed;
  }
  if (list.length === 0) list = keep(candidates({ ...opts, usedIds, usedFacts, ignore: true }));
  if (opts.avoidPiece && list.some((ask) => ask.pieceId !== opts.avoidPiece)) {
    list = list.filter((ask) => ask.pieceId !== opts.avoidPiece);
  }
  if (list.length === 0) list = keep(questionPool());
  const index = Math.min(Math.max(list.length - 1, 0), Math.floor(opts.rng() * Math.max(list.length, 1)));
  return list[index] ?? list[0] ?? questionPool()[0]!;
}
