import {
  answerQuiz,
  answerStake,
  drawLeft,
  drawRight,
  openQuiz,
  passTurn,
  playAbility,
  playCard,
  skipStake,
  startStake,
  type AbilityId,
  type Book,
} from "./table.ts";

function has(book: Book, ability: AbilityId): boolean {
  return book.hands.b.some((card) => card.ability === ability && !card.down && !card.frozen);
}

function choice(book: Book, rng: () => number): number {
  const ask = book.ask;
  if (!ask) return 0;
  const hard = ask.topic === "hiero" || ask.topic === "curriculum";
  if (rng() < (hard ? 0.55 : 0.7)) return ask.answer;
  const wrong = [0, 1, 2, 3].filter((index) => index !== ask.answer);
  return wrong[Math.floor(rng() * wrong.length)] ?? 0;
}

export function aiAct(book: Book, rng: () => number): Book | null {
  if (book.over || book.turn !== "b") return null;
  if (book.step === "between") return null;
  if (book.step === "stake" && book.stakeSeat === "b") {
    return rng() < 0.65 ? startStake(book, "b", rng) : skipStake(book, "b");
  }
  if (book.step === "stakeQuiz" && book.stakeSeat === "b") return answerStake(book, "b", choice(book, rng));
  if (book.step === "result") return passTurn(book, "b");
  if (book.step === "papyrus") return drawLeft(book, "b");
  if (book.step === "quiz") return answerQuiz(book, "b", choice(book, rng));
  if (book.step === "riddle") {
    const pieceId = book.ask?.pieceId;
    const held = pieceId
      ? book.hands.b.find((card) => card.pieceId === pieceId && !card.down && !card.frozen)
      : undefined;
    if (held && rng() < 0.72) return playCard(book, "b", held.uid);
    if (has(book, "thoth")) return playAbility(book, "b", "thoth");
    return openQuiz(book, "b");
  }
  if (book.step === "draw") {
    const hidden = book.hands.b.find((card) => card.down && !card.frozen);
    if (hidden && has(book, "eye")) return playAbility(book, "b", "eye", { side: "self", uid: hidden.uid });
    if (has(book, "thoth") && rng() < 0.35) return playAbility(book, "b", "thoth");
    if (!book.ward.b && has(book, "scarab") && rng() < 0.8) return playAbility(book, "b", "scarab");
    if (!book.cobra.b && has(book, "cobra") && rng() < 0.7) return playAbility(book, "b", "cobra");
    if (has(book, "adja") && book.hands.a.length > 0 && rng() < 0.55) {
      const mine = book.hands.b.find((card) => card.ability !== "adja");
      const theirs = book.hands.a[Math.floor(rng() * book.hands.a.length)];
      if (mine && theirs) return playAbility(book, "b", "adja", { uid: mine.uid, swap: theirs.uid });
    }
    if (book.right.length === 0) return null;
    return drawRight(book, "b");
  }
  return null;
}
