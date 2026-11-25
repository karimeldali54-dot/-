import { CULTURE_NAME, KIND_NAME, PIECES, pieceById, type Piece } from "./catalog.ts";
import { hieroIds, hieroRank, noteAsked, pickAsk, pickStakeAsk, questionPool, shuffle, type Ask } from "./questions.ts";

export type Seat = "a" | "b" | "c" | "d";
export type Step =
  | "draw"
  | "riddle"
  | "quiz"
  | "papyrus"
  | "result"
  | "between"
  | "stake"
  | "stakeQuiz"
  | "over";

export type AbilityId =
  | "maat"
  | "scarab"
  | "thoth"
  | "cobra"
  | "mummy"
  | "wrap"
  | "mouth"
  | "adja"
  | "eye"
  | "quake"
  | "toss";

export type InstantId = "bless" | "omen" | "guard" | "slip" | "sekhmet" | "raid" | "locust" | "scale" | "gift";
export type PapyrusId = AbilityId | InstantId;

export type Held = {
  uid: string;
  kind: "piece" | "ability";
  pieceId?: string;
  ability?: AbilityId;
  down: boolean;
  frozen: boolean;
};

export type Fuzura = { kind: "gate" } | { kind: "ask"; ask: Ask };

export type LogEntry = { seat: Seat; text: string; delta: number; secret?: boolean };

export type ShownCard = { name: string; image: string | null; fx: string | null };

export type Book = {
  dealId: string;
  roundNo: number;
  turn: Seat;
  step: Step;
  hands: Record<Seat, Held[]>;
  grave: Record<Seat, Held[]>;
  temple: string[];
  seen: string[];
  right: Fuzura[];
  left: PapyrusId[];
  ask: Ask | null;
  carried: boolean;
  queued: Ask | null;
  draws: Record<Seat, number>;
  pendingDraw: boolean;
  round: Record<Seat, number>;
  total: Record<Seat, number>;
  lockedRound: Record<Seat, number>;
  ward: Record<Seat, boolean>;
  cobra: Record<Seat, boolean>;
  usedIds: string[];
  usedFacts: string[];
  seq: number;
  note: string;
  lastDelta: Record<Seat, number>;
  log: LogEntry[];
  fx: "curse" | "gold" | null;
  burst: AbilityId | null;
  shown: ShownCard | null;
  shownSeat: Seat | null;
  peek: Record<Seat, string | null>;
  won: Record<Seat, string | null>;
  stakeSeat: Seat | null;
  over: boolean;
  winner: Seat | "tie" | null;
  rounds: number;
  /** Turn order. Two seats is the old duel; three or four is the group table. */
  order: Seat[];
};

export type PublicCard = {
  uid: string;
  face: "piece" | "ability" | "down";
  name: string;
  value: number;
  kindLabel: string;
  image?: string;
  blurb?: string;
  ability?: AbilityId;
  frozen: boolean;
  culture?: string;
  shield?: boolean;
};

export type TableView = {
  dealId: string;
  seat: Seat;
  youHand: PublicCard[];
  oppSlots: PublicCard[];
  scoreYou: number;
  scoreOpp: number;
  roundYou: number;
  roundOpp: number;
  totalYou: number;
  totalOpp: number;
  roundNo: number;
  drawsYou: number;
  drawsOpp: number;
  turn: "you" | "opp";
  step: Step;
  over: boolean;
  winner: "you" | "opp" | "tie" | null;
  rightLeft: number;
  leftLeft: number;
  stem: string;
  glyphs: string | null;
  carried: boolean;
  note: string;
  lastDeltaYou: number;
  lastDeltaOpp: number;
  quiz: { q: string; options: string[]; glyphs: string | null } | null;
  log: { who: "you" | "opp"; text: string; delta: number }[];
  fx: "curse" | "gold" | null;
  burst: AbilityId | null;
  shown: ShownCard | null;
  peek: string | null;
  wonId: string | null;
  canDraw: boolean;
  canLeft: boolean;
  canPlay: boolean;
  canQuiz: boolean;
  canPass: boolean;
  canFlip: boolean;
  canNext: boolean;
  canStake: boolean;
  canAbilities: AbilityId[];
  stake: boolean;
  rounds: number;
  roster: { total: number; round: number; active: boolean; you: boolean }[];
};

export const ROUNDS = 3;
const HAND = 4;

export const ABILITY_ART: Record<AbilityId, string> = {
  maat: "/abilities/maat.jpg",
  scarab: "/abilities/scarab.jpg",
  thoth: "/abilities/thoth.jpg",
  cobra: "/abilities/cobra.jpg",
  mummy: "/abilities/mummy.jpg",
  wrap: "/abilities/wrap.jpg",
  mouth: "/abilities/mouth.jpg",
  adja: "/abilities/adja.jpg",
  eye: "/abilities/eye.jpg",
  quake: "/abilities/quake.jpg",
  toss: "/abilities/toss.jpg",
};

export const INSTANT_ART: Record<InstantId, string> = {
  bless: "/abilities/bless.jpg",
  omen: "/abilities/omen.jpg",
  guard: "/abilities/guard.jpg",
  slip: "/abilities/slip.jpg",
  sekhmet: "/abilities/sekhmet.jpg",
  raid: "/abilities/raid.jpg",
  locust: "/abilities/locust.jpg",
  scale: "/abilities/scale.jpg",
  gift: "/abilities/gift.jpg",
};

export const CARD_NAME: Record<PapyrusId, string> = {
  maat: "ماعت",
  scarab: "الجعران",
  thoth: "ساعة تحوت",
  cobra: "الكوبرا",
  mummy: "المومياء",
  wrap: "التحنيط",
  mouth: "فتح الفم",
  adja: "عِجا",
  eye: "عين حورس",
  quake: "الزلزال",
  toss: "ارمي يا برعي",
  bless: "بركة",
  omen: "فأل",
  guard: "حارس",
  slip: "عثرة",
  sekhmet: "لعنة سخمت",
  raid: "نهب",
  locust: "جراد",
  scale: "ميزان",
  gift: "هدية المعبد",
};

export const ABILITY_HINT: Record<AbilityId, string> = {
  maat: "النقط تبقى زي بعض، والكروت ما تتغيرش. أو الخصم يرمي أعلى كرت.",
  scarab: "درع على كروتِك طول الجولة. اللي يجي ضدك يرتد، والدرع يتشال.",
  thoth: "بتبدّل الفزورة اللي قدامك، أو الجاية قبل ما تسحبها.",
  cobra: "الإجابة الصح الجاية ×٢.",
  mummy: "تاخد نقاط كارت من المقبرة، والكروت ما ترجعش.",
  wrap: "جمّد كرت عند الخصم لآخر الجولة.",
  mouth: "يفك التحنيط.",
  adja: "اختَر كرتك، وبعدين كرت الخصم، ويتبدلوا من غير ما تشوف.",
  eye: "تفتح المقلوب أو تشوف كرت خصمك. قبل سحب الفزورة.",
  quake: "تخلط الإيدين وتوزعهم تاني.",
  toss: "كل واحد يرمي كرت عشوائي.",
};

const ABILITY_COPIES: AbilityId[] = [
  "adja",
  "adja",
  "eye",
  "eye",
  "wrap",
  "wrap",
  "mouth",
  "mouth",
  "thoth",
  "scarab",
  "cobra",
  "mummy",
  "maat",
  "quake",
  "toss",
];
const MIDDLE_INSTANTS: InstantId[] = ["bless", "scale", "sekhmet", "slip", "locust"];

function papyrusDeck(rng: () => number): PapyrusId[] {
  const abilities = shuffle(ABILITY_COPIES, rng);
  const middle = shuffle<PapyrusId>([...abilities.slice(5, 10), ...MIDDLE_INSTANTS], rng);
  return [...abilities.slice(0, 5), ...middle, ...abilities.slice(10)];
}
const ABILITY_SET = new Set<string>([
  "maat",
  "scarab",
  "thoth",
  "cobra",
  "mummy",
  "wrap",
  "mouth",
  "adja",
  "eye",
  "quake",
  "toss",
]);
const SCARY = new Set<AbilityId>(["wrap", "quake", "adja", "toss"]);

export function isAbility(id: PapyrusId): id is AbilityId {
  return ABILITY_SET.has(id);
}

export function other(seat: Seat): Seat {
  return seat === "a" ? "b" : "a";
}

const SEAT_ORDER: Seat[] = ["a", "b", "c", "d"];

export function seatsOf(book: { order?: Seat[] }): Seat[] {
  const order = book.order?.filter((seat): seat is Seat => SEAT_ORDER.includes(seat));
  return order && order.length >= 2 ? order : ["a", "b"];
}

function nextSeat(book: { order?: Seat[] }, seat: Seat): Seat {
  const order = seatsOf(book);
  const index = order.indexOf(seat);
  if (index < 0) return order[0] ?? "b";
  return order[(index + 1) % order.length] ?? "b";
}

function emptyHands(): Record<Seat, Held[]> {
  return { a: [], b: [], c: [], d: [] };
}

function zeroSeats(): Record<Seat, number> {
  return { a: 0, b: 0, c: 0, d: 0 };
}

function falseSeats(): Record<Seat, boolean> {
  return { a: false, b: false, c: false, d: false };
}

function nullSeats<T>(): Record<Seat, T | null> {
  return { a: null, b: null, c: null, d: null };
}

function blank(dealId: string): Book {
  return {
    dealId,
    roundNo: 1,
    turn: "a",
    step: "draw",
    hands: emptyHands(),
    grave: emptyHands(),
    temple: [],
    seen: [],
    right: [],
    left: [],
    ask: null,
    carried: false,
    queued: null,
    draws: zeroSeats(),
    pendingDraw: false,
    round: zeroSeats(),
    total: zeroSeats(),
    lockedRound: zeroSeats(),
    ward: falseSeats(),
    cobra: falseSeats(),
    usedIds: [],
    usedFacts: [],
    seq: 0,
    note: "",
    lastDelta: zeroSeats(),
    log: [],
    fx: null,
    burst: null,
    shown: null,
    shownSeat: null,
    peek: nullSeats(),
    won: nullSeats(),
    stakeSeat: null,
    over: false,
    winner: null,
    rounds: ROUNDS,
    order: ["a", "b"],
  };
}

type SeatPatch<T> = Partial<Record<Seat, T>>;
type BookPatch = Omit<
  Partial<Book>,
  "hands" | "grave" | "draws" | "round" | "total" | "lockedRound" | "ward" | "cobra" | "lastDelta" | "peek" | "won"
> & {
  hands?: SeatPatch<Held[]>;
  grave?: SeatPatch<Held[]>;
  draws?: SeatPatch<number>;
  round?: SeatPatch<number>;
  total?: SeatPatch<number>;
  lockedRound?: SeatPatch<number>;
  ward?: SeatPatch<boolean>;
  cobra?: SeatPatch<boolean>;
  lastDelta?: SeatPatch<number>;
  peek?: SeatPatch<string | null>;
  won?: SeatPatch<string | null>;
};

export function testBook(patch: BookPatch): Book {
  const base = blank(patch.dealId ?? "t");
  return {
    ...base,
    ...patch,
    hands: { ...base.hands, ...patch.hands },
    grave: { ...base.grave, ...patch.grave },
    draws: { ...base.draws, ...patch.draws },
    round: { ...base.round, ...patch.round },
    total: { ...base.total, ...patch.total },
    lockedRound: { ...base.lockedRound, ...patch.lockedRound },
    ward: { ...base.ward, ...patch.ward },
    cobra: { ...base.cobra, ...patch.cobra },
    lastDelta: { ...base.lastDelta, ...patch.lastDelta },
    peek: { ...base.peek, ...patch.peek },
    won: { ...base.won, ...patch.won },
    order: patch.order ?? base.order,
  };
}

function points(book: Book, seat: Seat): number {
  return book.total[seat] + book.round[seat];
}

function commit(before: Book, draft: Book, seat: Seat, note: string, secret = false): Book {
  const lastDelta = zeroSeats();
  for (const player of seatsOf(draft)) lastDelta[player] = points(draft, player) - points(before, player);
  const fx = seatsOf(draft).some((player) => lastDelta[player] < 0) ? "curse" : draft.fx;
  return {
    ...draft,
    lastDelta,
    fx,
    note,
    log: [...draft.log, { seat, text: note, delta: lastDelta[seat], secret }],
  };
}

function can(book: Book, seat: Seat, step: Step): boolean {
  return !book.over && book.turn === seat && book.step === step;
}

function takeUid(book: Book): string {
  book.seq += 1;
  return `${book.dealId}-${book.seq}`;
}

function pieceHeld(book: Book, id: string): Held {
  return { uid: takeUid(book), kind: "piece", pieceId: id, down: false, frozen: false };
}

function cardName(card: Held): string {
  if (card.kind === "ability" && card.ability) return CARD_NAME[card.ability];
  if (card.pieceId) return pieceById(card.pieceId).name;
  return "ورقة";
}

function gain(book: Book, seat: Seat, amount: number, cobraOk: boolean): number {
  let next = amount;
  if (cobraOk && next > 0 && book.cobra[seat]) {
    book.cobra[seat] = false;
    next *= 2;
  }
  book.round[seat] += next;
  return next;
}

function hurt(book: Book, seat: Seat, amount: number): string {
  if (book.ward[seat]) {
    book.ward[seat] = false;
    book.round[nextSeat(book, seat)] += amount;
    return "الجعران ردّها.";
  }
  book.round[seat] += amount;
  return "";
}

function remember(book: Book, ask: Ask | null | undefined) {
  if (!ask?.id) return;
  book.usedIds.push(ask.id);
  book.usedFacts.push(ask.fact);
  noteAsked(ask);
}

function takeHiero(book: Book, rank: "easy" | "mid" | "hard", rng: () => number): Ask {
  const ids = hieroIds(rank);
  const fresh = questionPool().filter((ask) => ids.includes(ask.id) && !book.usedIds.includes(ask.id));
  const list = fresh.length > 0 ? fresh : questionPool().filter((ask) => ids.includes(ask.id));
  const ask = list[Math.floor(rng() * list.length)] ?? list[0];
  if (!ask) {
    const fallback = pickAsk({ rng, usedIds: book.usedIds, usedFacts: book.usedFacts });
    remember(book, fallback);
    return fallback;
  }
  remember(book, ask);
  return ask;
}

function buildRight(book: Book, active: string[], rng: () => number): Fuzura[] {
  const asks: Ask[] = [];
  const usedIds = [...book.usedIds];
  const usedFacts = [...book.usedFacts];
  for (const id of shuffle(active, rng).slice(0, 12)) {
    const ask = pickAsk({ rng, usedIds, usedFacts, pieceId: id, topic: "piece" });
    asks.push(ask);
    usedIds.push(ask.id);
    usedFacts.push(ask.fact);
    remember(book, ask);
  }
  for (const rank of ["easy", "mid", "hard"] as const) asks.push(takeHiero(book, rank, rng));
  const cards: Fuzura[] = [
    ...asks.map((ask) => ({ kind: "ask" as const, ask })),
    ...Array.from({ length: 9 }, () => ({ kind: "gate" as const })),
  ];
  return shuffle(cards, rng);
}

function freshRound(book: Book, rng: () => number): Book {
  const draft = structuredClone(book);
  const order = seatsOf(draft);
  for (const seat of order) {
    const keep: Held[] = [];
    for (const card of draft.hands[seat]) {
      if (card.kind === "ability" && !card.down) keep.push({ ...card, frozen: false });
      else draft.grave[seat].push({ ...card, down: false, frozen: false });
    }
    draft.hands[seat] = keep;
  }
  const need = Math.max(12, HAND * order.length + 4);
  let pool = PIECES.filter((piece) => !draft.seen.includes(piece.id));
  if (pool.length < need) pool = [...PIECES];
  const picked = shuffle(pool, rng).slice(0, need);
  draft.seen.push(...picked.map((piece) => piece.id));
  const ids = picked.map((piece) => piece.id);
  draft.temple = ids.slice(HAND * order.length);
  order.forEach((seat, index) => {
    for (const id of ids.slice(index * HAND, (index + 1) * HAND)) draft.hands[seat].push(pieceHeld(draft, id));
  });
  draft.right = buildRight(draft, ids, rng);
  draft.left = papyrusDeck(rng);
  draft.ask = null;
  draft.carried = false;
  draft.queued = null;
  draft.draws = zeroSeats();
  draft.pendingDraw = false;
  draft.round = zeroSeats();
  draft.ward = falseSeats();
  draft.cobra = falseSeats();
  draft.step = "draw";
  draft.turn = order[0] ?? "a";
  draft.fx = null;
  draft.burst = null;
  draft.shown = null;
  draft.shownSeat = null;
  draft.peek = nullSeats();
  draft.won = nullSeats();
  draft.note = "";
  draft.lastDelta = zeroSeats();
  draft.stakeSeat = null;
  draft.over = false;
  draft.winner = null;
  return draft;
}

export function dealMatch(dealId: string, rng: () => number = Math.random, rounds = ROUNDS, players = 2): Book {
  const count = players === 3 ? 3 : players === 4 ? 4 : 2;
  const order = SEAT_ORDER.slice(0, count);
  const dealt = freshRound({ ...blank(dealId), order }, rng);
  dealt.rounds = rounds === 1 ? 1 : ROUNDS;
  dealt.order = order;
  return dealt;
}

function clearFace(draft: Book) {
  draft.fx = null;
  draft.burst = null;
  draft.shown = null;
  draft.won = nullSeats();
}

export function drawRight(book: Book, seat: Seat): Book {
  if (!can(book, seat, "draw")) return book;
  const draft = structuredClone(book);
  clearFace(draft);
  if (draft.right.length === 0) return endRound(draft);
  const [card, ...rest] = draft.right;
  draft.right = rest;
  draft.pendingDraw = true;
  if (!card || card.kind === "gate" || !card.ask) {
    draft.step = "papyrus";
    draft.ask = null;
    draft.note = "أمر: روح لورق البردية.";
    return draft;
  }
  draft.ask = card.ask;
  draft.carried = false;
  draft.step = card.ask.pieceId ? "riddle" : "quiz";
  draft.note = "";
  return draft;
}

function judge(before: Book, draft: Book, seat: Seat, solved: boolean, note: string): Book {
  if (!solved && !draft.carried) {
    if (draft.ask?.pieceId && !draft.queued) draft.queued = draft.ask;
    if (!draft.ask?.pieceId && !draft.queued) draft.queued = null;
    note = draft.ask?.pieceId || draft.queued ? `${note} نفس الفزورة فاضلة.` : note;
  } else if (!solved && draft.carried) {
    draft.queued = null;
    note = `${note} الفزورة اترمَت.`;
  } else {
    draft.queued = null;
    if (solved) note = `${note} الفزورة اختفت.`;
  }
  draft.ask = null;
  draft.step = "result";
  return settle(before, draft, seat, note);
}

export function playCard(book: Book, seat: Seat, uid: string): Book {
  if (!can(book, seat, "riddle") || !book.ask?.pieceId) return book;
  const card = book.hands[seat].find((item) => item.uid === uid);
  if (!card || card.down || card.frozen || card.kind !== "piece") return book;
  const draft = structuredClone(book);
  clearFace(draft);
  const held = draft.hands[seat].find((item) => item.uid === uid);
  if (!held?.pieceId || !draft.ask) return book;
  if (held.pieceId === draft.ask.pieceId) {
    const piece = pieceById(held.pieceId);
    const got = gain(draft, seat, piece.value, true);
    draft.hands[seat] = draft.hands[seat].filter((item) => item.uid !== uid);
    draft.grave[seat].push({ ...held, down: false, frozen: false });
    draft.won[seat] = piece.id;
    return judge(book, draft, seat, true, `${piece.name} صح. +${got}`);
  }
  const bounced = hurt(draft, seat, -1);
  return judge(book, draft, seat, false, bounced ? `غلط. ${bounced}` : "غلط. −١");
}

export function openQuiz(book: Book, seat: Seat): Book {
  if (!can(book, seat, "riddle") || !book.ask) return book;
  const draft = structuredClone(book);
  const origin = draft.ask;
  if (!origin) return book;
  const quiz = pickAsk({
    rng: Math.random,
    usedIds: [...draft.usedIds, origin.id],
    usedFacts: [...draft.usedFacts, origin.fact],
    topic: "any",
    avoidPiece: origin.pieceId ?? undefined,
    question: true,
  });
  remember(draft, quiz);
  draft.queued = origin;
  draft.ask = quiz;
  draft.step = "quiz";
  draft.note = "";
  return draft;
}

function quizScore(ask: Ask): number {
  if (ask.topic !== "hiero") return 1;
  return hieroRank(ask.id) === "easy" ? 2 : 5;
}

export function answerQuiz(book: Book, seat: Seat, choice: number): Book {
  if (!can(book, seat, "quiz") || !book.ask) return book;
  const draft = structuredClone(book);
  clearFace(draft);
  if (!draft.ask) return book;
  if (choice === draft.ask.answer) {
    const got = gain(draft, seat, quizScore(draft.ask), true);
    return judge(book, draft, seat, true, `إجابة صح. +${got}`);
  }
  const bounced = hurt(draft, seat, -1);
  return judge(book, draft, seat, false, bounced ? `إجابة غلط. ${bounced}` : "إجابة غلط. −١");
}

function resolveInstant(before: Book, draft: Book, seat: Seat, id: InstantId, secret = false): Book {
  const foe = nextSeat(draft, seat);
  const done = (note: string) => settle(before, draft, seat, note, secret);
  if (id === "bless") {
    const got = gain(draft, seat, 2, false);
    return done(`بركة. +${got}`);
  }
  if (id === "omen") {
    const got = gain(draft, seat, 1, false);
    return done(`فأل. +${got}`);
  }
  if (id === "guard") return done("حارس. صفر.");
  if (id === "slip") {
    const bounced = hurt(draft, seat, -1);
    return done(bounced ? `عثرة. ${bounced}` : "عثرة. −١");
  }
  if (id === "sekhmet") {
    const bounced = hurt(draft, seat, -2);
    return done(bounced ? `لعنة سخمت. ${bounced}` : "لعنة سخمت. −٢");
  }
  if (id === "raid") {
    gain(draft, seat, 1, false);
    const bounced = hurt(draft, foe, -1);
    return done(bounced ? `نهب. ${bounced}` : "نهب. أنت +١ والخصم −١");
  }
  if (id === "locust") {
    const bounced = hurt(draft, foe, -2);
    return done(bounced ? `جراد. ${bounced}` : "جراد. الخصم −٢");
  }
  if (id === "scale") {
    hurt(draft, seat, -1);
    hurt(draft, foe, -1);
    return done("ميزان. الاتنين −١");
  }
  if (draft.temple.length === 0) {
    gain(draft, seat, 1, false);
    return done("هدية والمعبد فاضي. +١");
  }
  const [gainId, ...temple] = draft.temple;
  draft.temple = temple;
  if (gainId) draft.hands[seat].push(pieceHeld(draft, gainId));
  const piece = pieceById(gainId ?? "");
  return done(`هدية المعبد: ${piece.name}.`);
}

export function drawLeft(book: Book, seat: Seat): Book {
  if (!can(book, seat, "papyrus")) return book;
  const draft = structuredClone(book);
  clearFace(draft);
  if (draft.left.length === 0) {
    draft.step = "result";
    return settle(book, draft, seat, "ورق البردية خلص.");
  }
  const [id, ...rest] = draft.left;
  draft.left = rest;
  if (!id) return book;
  draft.step = "result";
  if (isAbility(id)) {
    draft.hands[seat].push({
      uid: takeUid(draft),
      kind: "ability",
      ability: id,
      down: false,
      frozen: false,
    });
    draft.burst = id;
    draft.fx = "gold";
    draft.shown = { name: CARD_NAME[id], image: ABILITY_ART[id], fx: id };
    draft.shownSeat = seat;
    return settle(book, draft, seat, `دخلت إيدك: ${CARD_NAME[id]}.`, true);
  }
  draft.shown = { name: CARD_NAME[id], image: INSTANT_ART[id], fx: id };
  draft.shownSeat = seat;
  return resolveInstant(book, draft, seat, id, true);
}

function endRound(draft: Book): Book {
  draft.lockedRound = { ...draft.round };
  for (const seat of seatsOf(draft)) {
    draft.total[seat] += draft.round[seat];
    draft.round[seat] = 0;
  }
  draft.pendingDraw = false;
  draft.queued = null;
  draft.ask = null;
  draft.fx = "gold";
  if (draft.roundNo >= (draft.rounds || ROUNDS)) return openStakeOrFinish(draft);
  draft.step = "between";
  draft.turn = seatsOf(draft)[0] ?? "a";
  draft.note = "";
  return draft;
}

function openStakeOrFinish(draft: Book): Book {
  const order = seatsOf(draft);
  const best = Math.max(...order.map((seat) => draft.total[seat]));
  const worst = Math.min(...order.map((seat) => draft.total[seat]));
  const leaders = order.filter((seat) => draft.total[seat] === best);
  const trailers = order.filter((seat) => draft.total[seat] === worst);
  if (leaders.length !== 1 || trailers.length !== 1 || best === worst) return finish(draft);
  draft.stakeSeat = trailers[0] ?? null;
  draft.turn = draft.stakeSeat ?? order[0] ?? "a";
  draft.step = "stake";
  draft.note = "تحدي الفرعون للمتأخر.";
  return draft;
}

function finish(draft: Book): Book {
  const order = seatsOf(draft);
  const best = Math.max(...order.map((seat) => draft.total[seat]));
  const leaders = order.filter((seat) => draft.total[seat] === best);
  draft.over = true;
  draft.step = "over";
  draft.winner = leaders.length === 1 ? leaders[0] ?? "tie" : "tie";
  draft.fx = draft.winner ? "gold" : null;
  return draft;
}

export function nextRound(book: Book, seat: Seat, rng: () => number = Math.random): Book {
  if (book.step !== "between" || seat !== (seatsOf(book)[0] ?? "a")) return book;
  const draft = structuredClone(book);
  draft.roundNo += 1;
  draft.lockedRound = zeroSeats();
  return freshRound(draft, rng);
}

export function startStake(book: Book, seat: Seat, rng: () => number = Math.random): Book {
  if (book.step !== "stake" || book.stakeSeat !== seat) return book;
  const draft = structuredClone(book);
  const ask = pickStakeAsk({ rng, usedIds: draft.usedIds });
  remember(draft, ask);
  draft.ask = ask;
  draft.step = "stakeQuiz";
  draft.note = "تحدي الفرعون: إعراب.";
  return draft;
}

export function skipStake(book: Book, seat: Seat): Book {
  if (book.step !== "stake" || book.stakeSeat !== seat) return book;
  return finish(structuredClone(book));
}

export function answerStake(book: Book, seat: Seat, choice: number): Book {
  if (book.step !== "stakeQuiz" || book.stakeSeat !== seat || !book.ask) return book;
  const draft = structuredClone(book);
  const ok = choice === draft.ask?.answer;
  if (ok) draft.total[seat] *= 2;
  else draft.total[seat] = Math.floor(draft.total[seat] / 2);
  draft.fx = ok ? "gold" : "curse";
  draft.ask = null;
  const done = finish(draft);
  return commit(book, done, seat, ok ? "تحدي الفرعون صح. المجموع ×٢" : "تحدي الفرعون غلط. المجموع ÷٢");
}

function endTurn(book: Book, seat: Seat): Book {
  const draft = structuredClone(book);
  if (draft.pendingDraw) {
    draft.draws[seat] += 1;
    draft.pendingDraw = false;
  }
  clearFace(draft);
  draft.peek = nullSeats();
  draft.lastDelta = zeroSeats();
  draft.note = "";
  const foe = nextSeat(draft, seat);
  const queued = draft.queued;
  draft.queued = null;
  if (queued) {
    draft.turn = foe;
    draft.step = queued.pieceId ? "riddle" : "quiz";
    draft.ask = queued;
    draft.carried = true;
    draft.pendingDraw = true;
    return draft;
  }
  if (draft.right.length === 0) return endRound(draft);
  draft.turn = foe;
  draft.step = "draw";
  draft.ask = null;
  draft.carried = false;
  return draft;
}

function settle(before: Book, draft: Book, seat: Seat, note: string, secret = false): Book {
  const committed = commit(before, draft, seat, note, secret);
  const burst = committed.burst;
  const fx = committed.fx;
  const shown = committed.shown;
  if (committed.step !== "result" || committed.over) return committed;
  const next = endTurn(committed, seat);
  if (next.step === "between" || next.step === "stake" || next.step === "over") return { ...next, burst, shown };
  return { ...next, burst, fx, shown };
}

export function passTurn(book: Book, seat: Seat): Book {
  if (!can(book, seat, "result")) return book;
  return endTurn(book, seat);
}

export function flipCard(book: Book, _seat: Seat, _uid: string): Book {
  return book;
}

function dropRandom(draft: Book, seat: Seat): string {
  const list = draft.hands[seat];
  if (list.length === 0) return "";
  const index = Math.floor(Math.random() * list.length);
  const [card] = list.splice(index, 1);
  if (card) draft.grave[seat].push({ ...card, down: false });
  return card ? cardName(card) : "";
}

function consume(draft: Book, seat: Seat, ability: AbilityId): Held | null {
  const card = draft.hands[seat].find((item) => item.ability === ability && !item.down && !item.frozen);
  if (!card) return null;
  draft.hands[seat] = draft.hands[seat].filter((item) => item.uid !== card.uid);
  draft.grave[seat].push(card);
  return card;
}

function mark(draft: Book, ability: AbilityId) {
  draft.burst = ability;
  draft.fx = SCARY.has(ability) ? "curse" : "gold";
}

export function playAbility(
  book: Book,
  seat: Seat,
  ability: AbilityId,
  extra: { mode?: "balance" | "dump"; uid?: string; side?: "self" | "opp"; swap?: string } = {},
): Book {
  if (book.over || book.turn !== seat) return book;
  if (book.step !== "draw" && !(ability === "thoth" && book.step === "riddle")) return book;
  const owns = book.hands[seat].some((card) => card.ability === ability && !card.down && !card.frozen);
  if (!owns) return book;
  const foe = nextSeat(book, seat);

  if (ability === "thoth") {
    const draft = structuredClone(book);
    if (!consume(draft, seat, ability)) return book;
    const ask = pickAsk({
      rng: Math.random,
      usedIds: draft.usedIds,
      usedFacts: draft.usedFacts,
      topic: "piece",
      avoidPiece: draft.ask?.pieceId ?? undefined,
    });
    remember(draft, ask);
    mark(draft, ability);
    if (book.step === "riddle") {
      draft.ask = ask;
      draft.carried = false;
      draft.queued = null;
      draft.step = "riddle";
      draft.note = "ساعة تحوت: الفزورة اتبدلت.";
      return draft;
    }
    const index = draft.right.findIndex((card) => card.kind === "ask" && card.ask?.pieceId);
    if (index >= 0) draft.right[index] = { kind: "ask", ask };
    draft.note = index >= 0 ? "ساعة تحوت: الفزورة الجاية اتبدلت." : "ساعة تحوت: مفيش فزورة جاية.";
    return draft;
  }

  if (ability === "eye") {
    const oppTarget = extra.side === "opp" ? book.hands[foe].find((card) => card.uid === extra.uid) : undefined;
    const selfTarget = extra.side === "opp" ? undefined : book.hands[seat].find((card) => card.uid === extra.uid && card.down);
    if (!oppTarget && !selfTarget) return book;
    const draft = structuredClone(book);
    if (!consume(draft, seat, ability)) return book;
    mark(draft, ability);
    if (oppTarget) {
      draft.peek[seat] = cardName(oppTarget);
      draft.note = "";
      return draft;
    }
    const flipped = draft.hands[seat].find((card) => card.uid === selfTarget?.uid);
    if (flipped) flipped.down = false;
    draft.note = "";
    return draft;
  }

  if (ability === "scarab" || ability === "cobra" || ability === "mouth") {
    const draft = structuredClone(book);
    if (!consume(draft, seat, ability)) return book;
    mark(draft, ability);
    if (ability === "scarab") {
      draft.ward[seat] = true;
      draft.note = "الجعران جاهز.";
      return draft;
    }
    if (ability === "cobra") {
      draft.cobra[seat] = true;
      draft.note = "الكوبرا: الصح الجاي ×٢.";
      return draft;
    }
    if (ability === "mouth") {
      const target =
        draft.hands[seat].find((card) => card.uid === extra.uid && card.frozen) ??
        draft.hands[seat].find((card) => card.frozen);
      if (target) target.frozen = false;
      draft.note = target ? "فتح الفم: اللعنة اتفكت." : "فتح الفم: مفيش كرت متجمد.";
      return draft;
    }
    return draft;
  }

  const draft = structuredClone(book);
  clearFace(draft);
  if (!consume(draft, seat, ability)) return book;
  draft.step = "result";
  mark(draft, ability);

  if (ability === "maat") {
    if (extra.mode === "dump") {
      if (draft.ward[foe]) {
        draft.ward[foe] = false;
        const own = draft.hands[seat].filter((card) => card.kind === "piece" && card.pieceId && !card.down);
        own.sort((a, b) => pieceById(b.pieceId ?? "").value - pieceById(a.pieceId ?? "").value);
        const top = own[0];
        if (top) {
          draft.hands[seat] = draft.hands[seat].filter((card) => card.uid !== top.uid);
          draft.grave[seat].push({ ...top, down: false });
        }
        return settle(book, draft, seat, top ? `الجعران ردّ ماعت. رميت ${cardName(top)}.` : "الجعران ردّ ماعت.");
      }
      const pieces = draft.hands[foe].filter((card) => card.kind === "piece" && card.pieceId && !card.down);
      pieces.sort((a, b) => pieceById(b.pieceId ?? "").value - pieceById(a.pieceId ?? "").value);
      const top = pieces[0];
      if (!top) return settle(book, draft, seat, "ماعت: مفيش كرت نقاط.");
      draft.hands[foe] = draft.hands[foe].filter((card) => card.uid !== top.uid);
      draft.grave[foe].push({ ...top, down: false });
      return settle(book, draft, seat, `ماعت: الخصم رمى ${cardName(top)}.`);
    }
    const scores = seatsOf(draft).map((player) => draft.total[player] + draft.round[player]);
    const mid = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    for (const player of seatsOf(draft)) {
      draft.total[player] = mid;
      draft.round[player] = 0;
    }
    return settle(book, draft, seat, "ماعت: النقاط بقت زي بعض.");
  }

  if (ability === "mummy") {
    const pieces = draft.grave[seat].filter((card) => card.kind === "piece" && card.pieceId);
    pieces.sort((a, b) => pieceById(b.pieceId ?? "").value - pieceById(a.pieceId ?? "").value);
    const from = (extra.uid ? pieces.find((card) => card.uid === extra.uid) : undefined) ?? pieces[0];
    if (!from?.pieceId) return settle(book, draft, seat, "المومياء: المقبرة فاضية.");
    const piece = pieceById(from.pieceId);
    const got = gain(draft, seat, piece.value, true);
    draft.grave[seat] = draft.grave[seat].filter((card) => card.uid !== from.uid);
    return settle(book, draft, seat, `كسبت ${got} من كارت ${piece.name}`);
  }

  if (ability === "wrap") {
    const aimed = book.hands[foe].find((card) => card.uid === extra.uid && !card.frozen);
    if (!aimed) return book;
    const draft = structuredClone(book);
    clearFace(draft);
    if (!consume(draft, seat, ability)) return book;
    draft.step = "result";
    mark(draft, ability);
    if (draft.ward[foe]) {
      draft.ward[foe] = false;
      const own = draft.hands[seat].filter((card) => !card.frozen);
      const bounced = own[Math.floor(Math.random() * own.length)];
      if (bounced) bounced.frozen = true;
      return settle(book, draft, seat, "الجعران ردّ التحنيط.");
    }
    const target = draft.hands[foe].find((card) => card.uid === extra.uid);
    if (target) target.frozen = true;
    return settle(book, draft, seat, "التحنيط: كرت الخصم اتجمد.");
  }

  if (ability === "adja") {
    const mine = book.hands[seat].find((card) => card.uid === extra.uid && card.ability !== "adja");
    const theirs = book.hands[foe].find((card) => card.uid === extra.swap);
    if (!mine || !theirs) return book;
    const draft = structuredClone(book);
    clearFace(draft);
    if (!consume(draft, seat, ability)) return book;
    draft.step = "result";
    mark(draft, ability);
    if (draft.ward[foe]) {
      draft.ward[foe] = false;
      const stolen = draft.hands[seat].find((card) => card.uid === extra.uid);
      if (stolen) {
        draft.hands[seat] = draft.hands[seat].filter((card) => card.uid !== stolen.uid);
        draft.grave[seat].push({ ...stolen, down: false });
      }
      return settle(book, draft, seat, "الجعران ردّ عِجا.");
    }
    const ai = draft.hands[seat].findIndex((card) => card.uid === extra.uid);
    const bi = draft.hands[foe].findIndex((card) => card.uid === extra.swap);
    const left = draft.hands[seat][ai];
    const right = draft.hands[foe][bi];
    if (ai < 0 || bi < 0 || !left || !right) return book;
    draft.hands[seat][ai] = { ...right, down: true };
    draft.hands[foe][bi] = { ...left, down: true };
    return settle(book, draft, seat, "عِجا: الورقتين اتبدلوا من غير ما تتشاف.");
  }

  if (ability === "quake") {
    if (draft.ward[foe]) {
      draft.ward[foe] = false;
      return settle(book, draft, seat, "الجعران ردّ الزلزال.");
    }
    const order = seatsOf(draft);
    const counts = order.map((player) => draft.hands[player].length);
    const all = shuffle(order.flatMap((player) => draft.hands[player]), Math.random);
    let cursor = 0;
    order.forEach((player, index) => {
      const count = counts[index] ?? 0;
      draft.hands[player] = all.slice(cursor, cursor + count);
      cursor += count;
    });
    return settle(book, draft, seat, "الزلزال: الإيدين اتخلطوا.");
  }

  if (draft.ward[foe]) {
    draft.ward[foe] = false;
    dropRandom(draft, seat);
    dropRandom(draft, seat);
    return settle(book, draft, seat, "الجعران ردّ ارمي يا برعي.");
  }
  if (draft.ward[seat]) {
    draft.ward[seat] = false;
    dropRandom(draft, foe);
    dropRandom(draft, foe);
    return settle(book, draft, seat, "الجعران ردّ ارمي يا برعي.");
  }
  dropRandom(draft, seat);
  dropRandom(draft, foe);
  return settle(book, draft, seat, "ارمي يا برعي: كرت من كل إيد.");
}

function publicCard(card: Held, hide: boolean, shield = false): PublicCard {
  if (hide || card.down) {
    return {
      uid: card.uid,
      face: "down",
      name: "ورقة مقلوبة",
      value: 0,
      kindLabel: "ظهر",
      frozen: card.frozen,
      shield,
    };
  }
  if (card.kind === "ability" && card.ability) {
    return {
      uid: card.uid,
      face: "ability",
      name: CARD_NAME[card.ability],
      value: 0,
      kindLabel: "قدرة",
      ability: card.ability,
      image: ABILITY_ART[card.ability],
      blurb: ABILITY_HINT[card.ability],
      frozen: card.frozen,
      shield,
    };
  }
  const piece: Piece = pieceById(card.pieceId ?? "");
  return {
    uid: card.uid,
    face: "piece",
    name: piece.name,
    value: piece.value,
    kindLabel: KIND_NAME[piece.kind],
    image: piece.image,
    blurb: piece.blurb,
    culture: CULTURE_NAME[piece.culture],
    frozen: card.frozen,
    shield,
  };
}

function riddleLine(piece: Piece, salt: string): string {
  const kind = piece.kind === "king" ? "ملك" : piece.kind === "god" ? "معبود" : "قطعة";
  const frames = [
    `${kind} من ${piece.period}، خامته ${piece.material}. ${piece.blurb}، ومكانه ${piece.place}.`,
    `${piece.blurb}. ${kind} عصره ${piece.period}، وخامته ${piece.material}، ومكانه ${piece.place}.`,
    `${kind} يظهر في ${piece.place}. ${piece.blurb}. عصره ${piece.period} وخامته ${piece.material}.`,
    `خامته ${piece.material}، ومن ${piece.period}. ${piece.blurb}، ويُعرف من ${piece.place}.`,
    `${kind}، ${piece.blurb}. مكانه ${piece.place}، وعصره ${piece.period}.`,
  ];
  let hash = 0;
  for (let i = 0; i < salt.length; i += 1) hash = (hash * 33 + salt.charCodeAt(i)) >>> 0;
  return frames[hash % frames.length] ?? frames[0]!;
}

function live(book: Book, seat: Seat, stepOk: boolean): boolean {
  return book.turn === seat && !book.over && stepOk;
}

export function viewOf(book: Book, seat: Seat): TableView {
  const foe = nextSeat(book, seat);
  const showQuiz = (book.step === "quiz" || book.step === "stakeQuiz") && book.turn === seat && book.ask;
  const winner = book.winner === null ? null : book.winner === "tie" ? "tie" : book.winner === seat ? "you" : "opp";
  let note = book.note;
  if (book.step === "between") {
    note = "";
  }
  if (book.step === "over") {
    note = "";
  }
  const asking = book.step === "riddle" || book.step === "quiz" || book.step === "stakeQuiz" ? book.ask : null;
  let stem = asking?.stem ?? (book.step === "papyrus" ? "روح لورق البردية." : "");
  if (book.step === "riddle" && asking?.pieceId) {
    const piece = pieceById(asking.pieceId);
    if (piece.blurb) stem = riddleLine(piece, asking.id);
  } else if ((book.step === "quiz" || book.step === "stakeQuiz") && asking) {
    stem = book.step === "stakeQuiz" ? "تحدي الفرعون" : "سؤال";
  }
  const canAbilities: AbilityId[] = [];
  if (book.turn === seat && !book.over && book.step === "draw") {
    for (const card of book.hands[seat]) {
      if (card.kind === "ability" && card.ability && !card.down && !card.frozen) canAbilities.push(card.ability);
    }
  }
  if (book.turn === seat && !book.over && book.step === "riddle") {
    for (const card of book.hands[seat]) {
      if (card.ability === "thoth" && !card.down && !card.frozen) canAbilities.push("thoth");
    }
  }
  return {
    dealId: book.dealId,
    seat,
    youHand: book.hands[seat].map((card) => publicCard(card, false, book.ward[seat])),
    oppSlots: book.hands[foe].map((card) => publicCard(card, true, book.ward[foe])),
    scoreYou: points(book, seat),
    scoreOpp: points(book, foe),
    roundYou: book.step === "between" || book.step === "over" ? book.lockedRound[seat] : book.round[seat],
    roundOpp: book.step === "between" || book.step === "over" ? book.lockedRound[foe] : book.round[foe],
    totalYou: book.total[seat],
    totalOpp: book.total[foe],
    roundNo: book.roundNo,
    drawsYou: book.draws[seat],
    drawsOpp: book.draws[foe],
    turn: book.turn === seat ? "you" : "opp",
    step: book.step,
    over: book.over,
    winner,
    rightLeft: book.right.length,
    leftLeft: book.left.length,
    stem,
    glyphs: book.step === "riddle" && asking?.pieceId ? null : (asking?.glyphs ?? null),
    carried: book.carried,
    note,
    lastDeltaYou: book.lastDelta[seat],
    lastDeltaOpp: book.lastDelta[foe],
    quiz: showQuiz
      ? { q: book.ask?.stem ?? "", options: [...(book.ask?.options ?? [])], glyphs: book.ask?.glyphs ?? null }
      : null,
    log: book.log.slice(-8).map((entry) => ({
      who: entry.seat === seat ? "you" : "opp",
      text: entry.secret && entry.seat !== seat ? "سحب من البردية." : entry.text,
      delta: entry.delta,
    })),
    fx: book.fx,
    burst: null,
    shown: book.shownSeat === seat ? book.shown : null,
    peek: book.peek[seat],
    wonId: book.won[seat],
    canDraw: live(book, seat, book.step === "draw" && book.right.length > 0),
    canLeft: live(book, seat, book.step === "papyrus"),
    canPlay: live(book, seat, book.step === "riddle" && Boolean(book.ask?.pieceId)),
    canQuiz: live(book, seat, book.step === "riddle"),
    canPass: false,
    canFlip: false,
    canNext: book.step === "between" && seat === (seatsOf(book)[0] ?? "a") && !book.over,
    canStake: book.step === "stake" && book.stakeSeat === seat,
    canAbilities,
    stake: book.step === "stake" || book.step === "stakeQuiz",
    rounds: book.rounds || ROUNDS,
    roster: seatsOf(book).map((player) => ({
      total: book.total[player],
      round: book.round[player],
      active: book.turn === player,
      you: player === seat,
    })),
  };
}
