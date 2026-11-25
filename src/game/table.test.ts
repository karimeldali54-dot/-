import assert from "node:assert/strict";
import { test } from "node:test";
import { hieroRank, poolSize, questionPool } from "./questions.ts";
import {
  answerQuiz,
  dealMatch,
  drawLeft,
  drawRight,
  openQuiz,
  passTurn,
  playAbility,
  playCard,
  startStake,
  testBook,
  viewOf,
  type Held,
} from "./table.ts";

test("question pool clears ten thousand", () => {
  assert.ok(poolSize() >= 10000);
});

test("hieroglyph answers use ḫ and ꜥ, not x", () => {
  const kh = questionPool().find((ask) => ask.id === "hiero-kh");
  const ayin = questionPool().find((ask) => ask.id === "hiero-ayin");
  assert.ok(kh);
  assert.ok(ayin);
  assert.equal(kh.options[kh.answer], "ḫ");
  assert.equal(ayin.options[ayin.answer], "ꜥ");
  assert.notEqual(kh.options[kh.answer], "x");
});

test("the riddle pile is mixed, and a gate is not a riddle", () => {
  const dealt = dealMatch("z", () => 0.2);
  assert.equal(dealt.hands.a.length, 4);
  assert.equal(dealt.hands.b.length, 4);
  assert.equal(dealt.temple.length, 4);
  assert.equal(dealt.right.length, 24);
  assert.equal(dealt.left.length, 20);
  assert.equal(dealt.left.filter((id) => id === "adja").length, 2);
  assert.equal(dealt.left.filter((id) => id === "eye").length, 2);
  assert.equal(dealt.left.filter((id) => id === "wrap").length, 2);
  assert.equal(dealt.left.filter((id) => id === "mouth").length, 2);
  assert.equal(dealt.left.filter((id) => id === "maat").length, 1);
  assert.equal(dealt.left.filter((id) => id === "toss").length, 1);
  const instants = ["bless", "scale", "sekhmet", "slip", "locust"];
  assert.equal(dealt.left.filter((id) => instants.includes(id)).length, 5);
  assert.equal(dealt.left.slice(5, 15).filter((id) => instants.includes(id)).length, 5);
  assert.equal(dealt.right.filter((card) => card.kind === "gate").length, 9);
  const asks = dealt.right.flatMap((card) => (card.kind === "ask" ? [card.ask] : []));
  assert.equal(asks.length, 15);
  const hiero = asks.filter((ask) => ask.topic === "hiero");
  assert.equal(hiero.length, 3);
  assert.equal(new Set(hiero.map((ask) => hieroRank(ask.id))).size, 3);
  assert.equal(asks.filter((ask) => !ask.pieceId && ask.topic !== "hiero").length, 0);
  assert.equal(
    questionPool().some((ask) => ask.fact.endsWith(":kind") || ask.stem.includes("تصنيف")),
    false,
  );
  assert.equal(JSON.stringify(viewOf(dealt, "b")).includes('"answer"'), false);
});

function piece(uid: string, id: string): Held {
  return { uid, kind: "piece", pieceId: id, down: false, frozen: false };
}

test("a miss stays, a second miss throws the riddle away", () => {
  const ask = questionPool().find((item) => item.pieceId === "tut" && item.fact.endsWith(":who"));
  assert.ok(ask);
  let book = testBook({
    turn: "a",
    step: "riddle",
    ask,
    pendingDraw: true,
    hands: { a: [piece("k", "khafre")], b: [piece("z", "isis")] },
  });
  book = playCard(book, "a", "k");
  assert.equal(book.turn, "b");
  assert.equal(book.carried, true);
  assert.equal(book.ask?.id, ask.id);
  assert.match(book.log.at(-1)?.text ?? "", /فاضلة/);
  book = openQuiz(book, "b");
  const quiz = book.ask;
  assert.ok(quiz);
  assert.notEqual(quiz.id, ask.id);
  book = answerQuiz(book, "b", (quiz.answer + 1) % 4);
  assert.equal(book.queued, null);
  assert.match(book.log.map((entry) => entry.text).join(" "), /اترمَت/);
});

test("scarab sends the minus to the other seat", () => {
  const ask = questionPool().find((item) => item.pieceId === "tut");
  assert.ok(ask);
  let book = testBook({
    turn: "a",
    step: "quiz",
    ask,
    ward: { a: true, b: false },
    hands: { a: [], b: [] },
  });
  book = answerQuiz(book, "a", (ask.answer + 1) % 4);
  assert.equal(book.round.a, 0);
  assert.equal(book.round.b, -1);
  assert.equal(book.ward.a, false);
});

test("adja swaps only the two cards you pick", () => {
  const hands = {
    a: [piece("mine", "tut"), { uid: "ab", kind: "ability" as const, ability: "adja" as const, down: false, frozen: false }],
    b: [piece("theirs", "isis")],
  };
  const missed = playAbility(testBook({ turn: "a", step: "draw", hands }), "a", "adja");
  assert.equal(missed.hands.a.some((card) => card.ability === "adja"), true);
  assert.equal(missed.hands.a.some((card) => card.uid === "mine" && !card.down), true);
  const book = playAbility(testBook({ turn: "a", step: "draw", hands }), "a", "adja", { uid: "mine", swap: "theirs" });
  assert.equal(book.hands.a.some((card) => card.uid === "theirs" && card.down), true);
  assert.equal(book.hands.b.some((card) => card.uid === "mine" && card.down), true);
  const view = viewOf(book, "a");
  const hidden = view.youHand.find((card) => card.uid === "theirs");
  assert.equal(hidden?.name, "ورقة مقلوبة");
});

test("the round ends when the riddle pile is empty", () => {
  let book = testBook({
    turn: "a",
    step: "result",
    pendingDraw: true,
    right: [{ kind: "gate" }],
    draws: { a: 5, b: 5 },
    round: { a: 3, b: 5 },
    roundNo: 1,
  });
  book = passTurn(book, "a");
  assert.equal(book.step, "draw");
  book = testBook({
    turn: "a",
    step: "result",
    pendingDraw: true,
    right: [],
    round: { a: 3, b: 5 },
    roundNo: 1,
  });
  book = passTurn(book, "a");
  assert.equal(book.step, "between");
  assert.equal(book.total.a, 3);
  assert.equal(book.total.b, 5);
  assert.equal(viewOf(book, "a").note.includes("الخصم"), false);
});

test("a drawn papyrus card stays up after the turn passes", () => {
  const book = drawLeft(
    testBook({
      turn: "a",
      step: "papyrus",
      left: ["cobra"],
      right: [{ kind: "gate" }],
      hands: { a: [], b: [] },
    }),
    "a",
  );
  assert.equal(book.turn, "b");
  assert.equal(book.shown?.name, "الكوبرا");
  assert.equal(viewOf(book, "a").shown?.name, "الكوبرا");
  assert.equal(viewOf(book, "b").shown, null);
  assert.equal(viewOf(book, "b").log.at(-1)?.text, "سحب من البردية.");
  assert.equal(book.shown?.image, "/abilities/cobra.jpg");
  assert.equal(book.hands.a.some((card) => card.ability === "cobra"), true);
});

test("maat makes both scores the same and leaves the cards", () => {
  const book = playAbility(
    testBook({
      turn: "a",
      step: "draw",
      total: { a: 10, b: 0 },
      round: { a: 4, b: 1 },
      hands: {
        a: [{ uid: "m", kind: "ability", ability: "maat", down: false, frozen: false }],
        b: [piece("z", "isis"), piece("y", "tut")],
      },
    }),
    "a",
    "maat",
    { mode: "balance" },
  );
  assert.equal(book.total.a, 8);
  assert.equal(book.total.b, 8);
  assert.equal(book.round.a, 0);
  assert.equal(book.round.b, 0);
  assert.equal(book.hands.b.length, 2);
  assert.equal(book.hands.a.some((card) => card.ability === "maat"), false);
  assert.equal(book.shown, null);
});

test("played cards score 10 for a god, 5 for a king, and 1 for a piece", () => {
  const godAsk = questionPool().find((item) => item.pieceId === "anubis" && item.fact.endsWith(":who"));
  const kingAsk = questionPool().find((item) => item.pieceId === "tut" && item.fact.endsWith(":who"));
  const pieceAsk = questionPool().find((item) => item.pieceId === "rosetta" && item.fact.endsWith(":who"));
  assert.ok(godAsk && kingAsk && pieceAsk);
  const god = playCard(
    testBook({ turn: "a", step: "riddle", ask: godAsk, hands: { a: [piece("g", "anubis")], b: [] } }),
    "a",
    "g",
  );
  const king = playCard(
    testBook({ turn: "a", step: "riddle", ask: kingAsk, hands: { a: [piece("k", "tut")], b: [] } }),
    "a",
    "k",
  );
  const relic = playCard(
    testBook({ turn: "a", step: "riddle", ask: pieceAsk, hands: { a: [piece("p", "rosetta")], b: [] } }),
    "a",
    "p",
  );
  assert.equal(god.total.a + god.round.a, 10);
  assert.equal(king.total.a + king.round.a, 5);
  assert.equal(relic.total.a + relic.round.a, 1);
  assert.equal(god.hands.a.some((card) => card.pieceId === "anubis"), false);
});

test("thoth replaces the riddle in front of you, even a carried one", () => {
  const ask = questionPool().find((item) => item.pieceId === "tut" && item.fact.endsWith(":who"));
  assert.ok(ask);
  const fresh = playAbility(
    testBook({
      turn: "a",
      step: "riddle",
      ask,
      hands: {
        a: [{ uid: "t", kind: "ability", ability: "thoth", down: false, frozen: false }],
        b: [],
      },
    }),
    "a",
    "thoth",
  );
  assert.equal(fresh.step, "riddle");
  assert.equal(fresh.turn, "a");
  assert.notEqual(fresh.ask?.id, ask.id);
  assert.equal(fresh.hands.a.some((card) => card.ability === "thoth"), false);
  const carried = playAbility(
    testBook({
      turn: "b",
      step: "riddle",
      carried: true,
      ask,
      hands: {
        a: [],
        b: [{ uid: "t", kind: "ability", ability: "thoth", down: false, frozen: false }],
      },
    }),
    "b",
    "thoth",
  );
  assert.equal(carried.turn, "b");
  assert.equal(carried.step, "riddle");
  assert.equal(carried.carried, false);
  assert.notEqual(carried.ask?.id, ask.id);
});

test("a quick round ends after one round, and the stake is grammar", () => {
  const book = passTurn(
    testBook({
      turn: "a",
      step: "result",
      pendingDraw: true,
      right: [],
      round: { a: 3, b: 5 },
      roundNo: 1,
      rounds: 1,
    }),
    "a",
  );
  assert.equal(book.step, "stake");
  const asked = startStake(book, "a", () => 0.1);
  assert.equal(asked.step, "stakeQuiz");
  assert.equal(asked.ask?.topic, "hiero");
  assert.equal(asked.ask?.hard, true);
  assert.match(asked.ask?.stem ?? "", /إعراب|عبارة/);
});

test("mummy pays the grave card instead of returning it", () => {
  const book = playAbility(
    testBook({
      turn: "a",
      step: "draw",
      right: [{ kind: "gate" }],
      hands: {
        a: [{ uid: "m", kind: "ability", ability: "mummy", down: false, frozen: false }],
        b: [],
      },
      grave: { a: [piece("old", "anubis")], b: [] },
    }),
    "a",
    "mummy",
  );
  assert.equal(book.hands.a.some((card) => card.pieceId === "anubis"), false);
  assert.equal(book.round.a, 10);
  assert.match(book.log.at(-1)?.text ?? "", /كسبت 10 من كارت/);
});

test("the eye only opens the card you tap", () => {
  const hidden = piece("down", "khafre");
  hidden.down = true;
  const missed = playAbility(
    testBook({
      turn: "a",
      step: "draw",
      hands: {
        a: [{ uid: "eye", kind: "ability", ability: "eye", down: false, frozen: false }, hidden],
        b: [piece("opp", "isis")],
      },
    }),
    "a",
    "eye",
    { side: "self" },
  );
  assert.equal(missed.hands.a.some((card) => card.ability === "eye"), true);
  assert.equal(missed.hands.a.find((card) => card.uid === "down")?.down, true);
  const opened = playAbility(
    testBook({
      turn: "a",
      step: "draw",
      hands: {
        a: [{ uid: "eye", kind: "ability", ability: "eye", down: false, frozen: false }, hidden],
        b: [piece("opp", "isis"), piece("opp2", "tut")],
      },
    }),
    "a",
    "eye",
    { side: "opp", uid: "opp2" },
  );
  assert.equal(opened.peek.a, "توت عنخ آمون");
  assert.equal(viewOf(opened, "a").peek, "توت عنخ آمون");
  assert.equal(viewOf(opened, "b").peek, null);
  assert.equal(viewOf(opened, "b").note.includes("شفت"), false);
  assert.equal(opened.hands.a.some((card) => card.ability === "eye"), false);
});

test("wrap freezes the chosen card until the mouth opens it", () => {
  const hands = {
    a: [{ uid: "w", kind: "ability" as const, ability: "wrap" as const, down: false, frozen: false }],
    b: [piece("x", "isis"), piece("y", "tut")],
  };
  const missed = playAbility(testBook({ turn: "a", step: "draw", hands, right: [{ kind: "gate" }] }), "a", "wrap");
  assert.equal(missed.hands.a.some((card) => card.ability === "wrap"), true);
  assert.equal(missed.hands.b.every((card) => !card.frozen), true);
  const frozen = playAbility(
    testBook({ turn: "a", step: "draw", hands, right: [{ kind: "gate" }] }),
    "a",
    "wrap",
    { uid: "y" },
  );
  assert.equal(frozen.hands.b.find((card) => card.uid === "y")?.frozen, true);
  assert.equal(frozen.hands.b.find((card) => card.uid === "x")?.frozen, false);
  frozen.hands.b.push({ uid: "m", kind: "ability", ability: "mouth", down: false, frozen: false });
  const opened = playAbility(frozen, "b", "mouth", { uid: "y" });
  assert.equal(opened.hands.b.find((card) => card.uid === "y")?.frozen, false);
});

test("a piece draw is a riddle, and the other ask is a question", () => {
  const ask = questionPool().find((item) => item.pieceId === "khafre" && item.fact.endsWith(":who"));
  assert.ok(ask);
  const view = viewOf(testBook({ turn: "a", step: "riddle", ask }), "a");
  assert.equal(view.stem.includes("؟"), false);
  assert.equal(view.stem.includes("خفرع"), false);
  assert.equal(view.stem.includes("فزورة"), false);
  assert.equal(view.stem.includes("متوسطة"), false);
  assert.match(view.stem, /جالس|صقر|ملك|خامته/);
  const quizzed = openQuiz(testBook({ turn: "a", step: "riddle", ask }), "a");
  const q = viewOf(quizzed, "a").quiz?.q ?? "";
  assert.match(q, /؟/);
  assert.equal(q.includes("فزورة"), false);
});

test("a gate does not open a question", () => {
  const book = drawRight(
    testBook({
      turn: "a",
      step: "draw",
      right: [{ kind: "gate" }, { kind: "ask", ask: questionPool()[0]! }],
      left: ["bless"],
    }),
    "a",
  );
  assert.equal(book.step, "papyrus");
  assert.equal(book.ask, null);
  const next = drawLeft(book, "a");
  assert.match(next.log.at(-1)?.text ?? "", /بركة/);
  assert.equal(next.round.a, 2);
  assert.equal(next.turn, "b");
});

test("hieroglyph questions score five, and an easy sign scores two", () => {
  const easy = questionPool().find((ask) => ask.id === "hiero-ayin");
  const mid = questionPool().find((ask) => ask.id === "hiero-style6");
  assert.ok(easy);
  assert.ok(mid);
  const easyBook = answerQuiz(
    testBook({ turn: "a", step: "quiz", ask: easy, right: [{ kind: "gate" }] }),
    "a",
    easy.answer,
  );
  const midBook = answerQuiz(
    testBook({ turn: "a", step: "quiz", ask: mid, right: [{ kind: "gate" }] }),
    "a",
    mid.answer,
  );
  assert.equal(easyBook.round.a, 2);
  assert.equal(midBook.round.a, 5);
});

test("a group table passes the turn around the seated players", () => {
  const dealt = dealMatch("group", () => 0.2, 3, 4);
  assert.deepEqual(dealt.order, ["a", "b", "c", "d"]);
  assert.equal(dealt.hands.a.length, 4);
  assert.equal(dealt.hands.d.length, 4);
  const next = drawLeft(
    testBook({
      order: ["a", "b", "c", "d"],
      turn: "a",
      step: "papyrus",
      pendingDraw: true,
      left: ["bless"],
      right: [{ kind: "gate" }],
    }),
    "a",
  );
  assert.equal(next.turn, "b");
});
