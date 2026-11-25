import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CardBack, CardView } from "@/components/throne/CardView";
import { aiAct } from "@/game/ai";
import { playCurse, playEnd, playGold, playLock } from "@/game/audio";
import {
  answerQuiz,
  answerStake,
  dealMatch,
  drawLeft,
  drawRight,
  flipCard,
  nextRound,
  openQuiz,
  passTurn,
  playAbility,
  playCard,
  skipStake,
  startStake,
  viewOf,
  seatsOf,
  ABILITY_ART,
  CARD_NAME,
  type AbilityId,
  type Book,
  type Seat,
  type TableView,
} from "@/game/table";
import { usePublicRoom } from "@/lib/multiplayer/use-public-room";
import { appDeepLink, insideAndroidApp } from "@/lib/multiplayer/app-link";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { bakedGameOrigin, readGameOrigin, writeGameOrigin } from "@/lib/multiplayer/origin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addCourtFriend, inviteCourtFriend, joinParty, leaveParty, loadCourt, loadParty, openParty, recordMatch, startParty, type PartySlot } from "@/lib/court/server";
import { ProfileDock, setCourtBridge } from "@/components/throne/CourtPanel";

const NAME_KEY = "throne-name";
const APK_HREF = "/kart-el-fer3on.apk";

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

function useNativeApp() {
  const [native, setNative] = useState(false);
  useEffect(() => {
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    setNative(Boolean(cap?.isNativePlatform?.()));
  }, []);
  return native;
}

function useApkHref() {
  const [href, setHref] = useState(APK_HREF);
  useEffect(() => {
    const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
    setHref(`${prefix}${APK_HREF}`);
  }, []);
  return href;
}

const stingers: HTMLAudioElement[] = [];

function playStinger(src: string, volume: number) {
  const theme = themeSong();
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = volume;
  audio.muted = theme?.muted ?? false;
  stingers.push(audio);
  if (theme && !theme.muted) theme.volume = 0.12;
  audio.onended = () => {
    const index = stingers.indexOf(audio);
    if (index >= 0) stingers.splice(index, 1);
    if (theme && !theme.muted && stingers.length === 0) theme.volume = 0.45;
  };
  void audio.play().catch(() => undefined);
}

function muteStingers(muted: boolean) {
  for (const audio of stingers) audio.muted = muted;
  const theme = themeSong();
  if (theme && !muted && stingers.length === 0) theme.volume = 0.45;
}

function warmArt() {
  const images = [
    ...Object.values(ABILITY_ART),
    "/abilities/bless.jpg",
    "/abilities/omen.jpg",
    "/abilities/guard.jpg",
    "/abilities/slip.jpg",
    "/abilities/sekhmet.jpg",
    "/abilities/raid.jpg",
    "/abilities/locust.jpg",
    "/abilities/scale.jpg",
    "/abilities/gift.jpg",
    "/art/card-back.jpg",
    "/art/hall.jpg",
    "/cards/osiris-card.jpg",
    "/cover.jpg",
  ];
  for (const src of images) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
  for (const src of ["/music/osiris-laugh.mp3", "/music/pharaoh-win.mp3"]) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;
  }
}

let themeAudio: HTMLAudioElement | null = null;
let themeHeld = false;

function themeSong() {
  if (typeof Audio === "undefined") return null;
  if (!themeAudio) {
    themeAudio = new Audio("/music/theme.mp3");
    themeAudio.loop = true;
    themeAudio.volume = 0.45;
  }
  return themeAudio;
}

function ThemeMusic() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const audio = themeSong();
    if (!audio) return;
    window.localStorage.removeItem("pharaoh-mute");
    audio.muted = false;
    audio.volume = 0.45;
    const start = () => {
      if (themeHeld || audio.muted || !audio.paused) return;
      void audio.play().catch(() => undefined);
    };
    start();
    warmArt();
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        const audio = themeSong();
        if (!audio) return;
        const next = !audio.muted;
        audio.muted = next;
        muteStingers(next);
        if (next) audio.pause();
        else if (!themeHeld) {
          audio.volume = stingers.length === 0 ? 0.45 : 0.12;
          void audio.play().catch(() => undefined);
        }
        setMuted(next);
      }}
      className="fixed top-3 left-3 z-50 rounded-full border border-gold bg-night/85 px-3 py-2 text-xs font-extrabold text-sand"
    >
      {muted ? "تشغيل الصوت" : "كتم الصوت"}
    </button>
  );
}

function Shell({ children, fx }: { children: ReactNode; fx?: "curse" | "gold" | null }) {
  return (
    <div className={`relative min-h-screen text-sand ${fx === "curse" ? "tomb-shake" : ""}`}>
      <ThemeMusic />
      <ProfileDock />
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <img src="/art/hall.jpg" alt="" className="h-full w-full object-contain object-center md:object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-night/25 via-night/78 to-night/88 md:bg-gradient-to-r md:from-night/20 md:via-night/74 md:to-night/20" />
      </div>
      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col overflow-x-hidden px-3 py-14">
        {children}
      </main>
    </div>
  );
}

function hostKey(room: string) {
  return `throne-host:${room}`;
}

function makeCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)] ?? "a";
  return code;
}

function shareUrl(room: string) {
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  const origin = readGameOrigin();
  if (cap?.isNativePlatform?.() && origin) return `${origin}/r/${room}`;
  const url = new URL(window.location.href);
  const prefix = previewPathPrefix(url.hostname, url.pathname) ?? "";
  url.pathname = `${prefix}/r/${room}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}

function deltaClass(n: number): string {
  if (n > 0) return "text-gain";
  if (n < 0) return "text-loss";
  return "text-sand/70";
}

function GoldButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 w-full rounded-card bg-gold text-base font-extrabold text-night disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 w-full rounded-card border-2 border-gold bg-night/70 text-base font-bold text-sand disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Rules() {
  const cards: { id: AbilityId; text: string }[] = [
    { id: "maat", text: "بتخلي مجموعك ومجموع خصمك رقم واحد، والكروت تفضل زي ما هي. أو بتجبره يرمي أعلى كارت نقط في إيده." },
    { id: "scarab", text: "درع أثري على كروتِك طول الجولة. أي حاجة تيجي ضدك ترتد على الخصم، والدرع يتشال والكروت تفضل من غيره." },
    { id: "thoth", text: "بتبدّل الفزورة. لو سحبت فزورة، أو رجعتلك فزورة متحلتش، استخدمها والفزورة تتغيّر. وقبل السحب بتبدّل الجاية." },
    { id: "cobra", text: "بيضاعف نقط إجابتك الصح الجاية (×٢)." },
    { id: "mummy", text: "بتاخد نقاط كارت من المقبرة. الكارت نفسه ما يرجعش لإيدك." },
    { id: "wrap", text: "بيجمّد كارت عند خصمك راوند كامل وميعرفش يلعبه. لو اختلسته هيفضل متجمد في إيدك." },
    { id: "mouth", text: "الكارت الوحيد اللي بيفك لعنة التحنيط فوراً عشان تلحق تلعب الكارت المتجمد في نفس الراوند." },
    { id: "adja", text: "اختَر كارت من كروتِك، وبعدين كارت من الخصم، ويتبدلوا من غير ما تشوف وشهم." },
    { id: "eye", text: "بتفتح ورقة مقلوبة عندك، أو تشوف كرت خصمك. اللي شاف هو بس اللي يظهرله الاسم. بتستخدمها قبل سحب الفزورة." },
    { id: "quake", text: "بيخلط كل الورق المكشوف والمقلوب اللي على الترابيزة ويوزعه من أول وجديد عشوائي." },
    { id: "toss", text: "كل واحد منكم يرمي كارت عشوائي من إيده في المقبرة فوراً." },
  ];
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <section className="rounded-card border border-gold/40 bg-night/80 p-4">
        <h2 className="glyphs text-center text-gold">𓉐𓉻</h2>
        <h3 className="text-center text-lg font-extrabold">كارت الفرعون</h3>
        <p className="mt-2">
          لعبة كروت وتحدي معلومات أثرية مصرية. مش مجرد أسئلة. دي حرب ذكاء ومكائد بينك وبين خصمك.
        </p>
      </section>
      <section className="rounded-card border border-gold/40 bg-night/80 p-4">
        <h2 className="text-lg font-extrabold text-gold">فكرة اللعب</h2>
        <p className="mt-2">قدامك كومين. كل لاعب معاه ٤ كروت عشوائية: ملوك أو معبودات أو آثار.</p>
        <p className="mt-2">
          <b>ورق الفزورة</b> يمين. بتسحب منه فزورة بتتكلم عن أثر أو ملك أو معبود. لو الكارت في إيدك نزّله وتاخد نقاطه. لو مش معاك، يجيلك سؤال مختلف خالص.
        </p>
        <p className="mt-2">
          <b>ورق البردية</b> شمال. كوم المفاجآت واللعنات والقدرات. لما تسحب كارت قدرة يظهر وشه زي الصورة، مش ضهره.
        </p>
        <p className="mt-2">لما تخلّص دورك، دور الخصم يبدأ لوحده. مفيش زرار تسليم.</p>
      </section>
      <section className="rounded-card border border-gold/40 bg-night/80 p-4">
        <h2 className="text-lg font-extrabold text-gold">الـ ١١ قدرة</h2>
        <div className="mt-3 space-y-3">
          {cards.map((card) => (
            <article key={card.id} className="flex gap-3">
              <img src={ABILITY_ART[card.id]} alt="" className="h-24 w-16 shrink-0 rounded-card object-cover" />
              <p>
                <b>{CARD_NAME[card.id]}. </b>
                {card.text}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-card border border-gold/40 bg-night/80 p-4">
        <h2 className="text-lg font-extrabold text-gold">المكسب والخسارة</h2>
        <p className="mt-2">
          ٣ راوندات. الراوند يخلّص لما ورق الفزورة يخلّص. النقاط بتتجمع، والأعلى ياخد كارت الفرعون الذهبي. الخسران يطلع له حساب أوزير.
        </p>
        <p className="mt-2">
          سؤال الهيروغليفي بـ ٥. السؤال السهل، زي المقطع الصوتي للعلامة، بـ ٢. تحدي الفرعون في الآخر زي ما هو: صح يضاعف مجموعك، وغلط ينصّه.
        </p>
        <p className="mt-2">تقدر تلعب مع صاحبك أونلاين، أو «إلعب مع الفرعون». الذكاء الاصطناعي بيفكر وبيغلط زي البني آدمين.</p>
        <p className="mt-2">في آخر الجولة التالتة، المتأخر يقدر ياخد تحدي الفرعون: صح يضاعف مجموعه، وغلط ينصّه.</p>
      </section>
    </div>
  );
}

const FANOOS_SRC = "https://pomf2.lain.la/f/cq0gi091.mp4";
const FANOOS_FALLBACK = "/ads/fanoos.mp4";
const SITRA = "https://www.facebook.com/share/1aqfNGHALi/";

function FanoosAd({ onBack }: { onBack: () => void }) {
  const [src, setSrc] = useState(FANOOS_SRC);
  const resume = useRef(false);
  const audio = themeSong();
  if (audio && !themeHeld) resume.current = !audio.muted;
  if (!themeHeld) themeHeld = true;
  audio?.pause();
  useEffect(() => {
    const current = themeSong();
    themeHeld = true;
    current?.pause();
    return () => {
      themeHeld = false;
      const back = themeSong();
      if (!back || !resume.current || back.muted) return;
      back.volume = stingers.length === 0 ? 0.45 : 0.12;
      void back.play().catch(() => undefined);
    };
  }, []);
  return (
    <Shell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">اعلان فانوس</h1>
        <button type="button" className="text-sm font-bold text-gold" onClick={onBack}>
          رجوع
        </button>
      </div>
      <video
        key={src}
        src={src}
        controls
        autoPlay
        playsInline
        preload="metadata"
        className="w-full rounded-card border-2 border-gold bg-black"
        onError={() => {
          if (src !== FANOOS_FALLBACK) setSrc(FANOOS_FALLBACK);
        }}
      />
      <div className="mt-4 text-center">
        <p className="text-lg font-extrabold">تابعوا صفحتنا سِطرا</p>
        <p className="mt-1 text-3xl leading-none" aria-hidden="true">
          👇
        </p>
        <a
          href={SITRA}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block break-all text-sm font-bold text-gold underline"
        >
          {SITRA}
        </a>
      </div>
    </Shell>
  );
}

type ClientMsg =
  | { t: "hello" }
  | { t: "who"; userId: string }
  | { t: "draw" }
  | { t: "left" }
  | { t: "play"; cardId: string }
  | { t: "quiz-open" }
  | { t: "quiz"; choice: number }
  | { t: "pass" }
  | { t: "flip"; cardId: string }
  | { t: "ability"; ability: AbilityId; mode?: "balance" | "dump"; uid?: string; side?: "self" | "opp"; swap?: string }
  | { t: "next" }
  | { t: "stake"; take: boolean }
  | { t: "rematch" };

const ABILITIES: AbilityId[] = ["maat", "scarab", "thoth", "cobra", "mummy", "wrap", "mouth", "adja", "eye", "quake", "toss"];

function isAbility(value: string): value is AbilityId {
  return (ABILITIES as string[]).includes(value);
}

function readClient(data: unknown): ClientMsg | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as ClientMsg;
  if (msg.t === "who" && typeof msg.userId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(msg.userId)) return msg;
  if (msg.t === "hello" || msg.t === "draw" || msg.t === "left" || msg.t === "quiz-open" || msg.t === "pass" || msg.t === "next" || msg.t === "rematch") {
    return msg;
  }
  if ((msg.t === "play" || msg.t === "flip") && typeof msg.cardId === "string") return msg;
  if (msg.t === "quiz" && typeof msg.choice === "number") return msg;
  if (msg.t === "stake" && typeof msg.take === "boolean") return msg;
  if (msg.t === "ability" && typeof msg.ability === "string" && isAbility(msg.ability)) return msg;
  return null;
}

function readState(data: unknown): { view: TableView; names: string[] } | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as { t?: string; view?: TableView; names?: unknown };
  if (msg.t !== "state" || !msg.view || !Array.isArray(msg.view.youHand)) return null;
  const names = Array.isArray(msg.names) ? msg.names.filter((item): item is string => typeof item === "string") : [];
  return { view: msg.view, names };
}

function readView(data: unknown): TableView | null {
  return readState(data)?.view ?? null;
}

function applySeat(book: Book, seat: Seat, msg: ClientMsg): Book {
  if (msg.t === "draw") return drawRight(book, seat);
  if (msg.t === "left") return drawLeft(book, seat);
  if (msg.t === "play") return playCard(book, seat, msg.cardId);
  if (msg.t === "quiz-open") return openQuiz(book, seat);
  if (msg.t === "quiz") {
    return book.step === "stakeQuiz" ? answerStake(book, seat, msg.choice) : answerQuiz(book, seat, msg.choice);
  }
  if (msg.t === "pass") return passTurn(book, seat);
  if (msg.t === "flip") return flipCard(book, seat, msg.cardId);
  if (msg.t === "ability") return playAbility(book, seat, msg.ability, { mode: msg.mode, uid: msg.uid, side: msg.side, swap: msg.swap });
  if (msg.t === "next") return nextRound(book, seatsOf(book)[0] ?? "a");
  if (msg.t === "stake") return msg.take ? startStake(book, seat) : skipStake(book, seat);
  if (msg.t === "rematch") return dealMatch(makeCode(), Math.random, book.rounds === 1 ? 1 : 3, seatsOf(book).length);
  return book;
}

function applyGuest(book: Book, msg: ClientMsg): Book {
  return applySeat(book, "b", msg);
}

function useFx(view: TableView | null) {
  const heard = useRef("");
  const seenOver = useRef(false);
  useEffect(() => {
    if (!view) return;
    const stamp = `${view.dealId}:${view.roundNo}:${view.step}:${view.log.length}:${view.fx}`;
    if (view.fx && heard.current !== stamp) {
      heard.current = stamp;
      if (view.fx === "curse") playCurse();
      if (view.fx === "gold") playGold();
    }
    if (!view.over) seenOver.current = false;
    else if (!seenOver.current) {
      seenOver.current = true;
      if (view.winner === "you") playStinger("/music/pharaoh-win.mp3", 0.8);
      else if (view.winner === "opp") playStinger("/music/osiris-laugh.mp3", 0.9);
      else playEnd("tie");
    }
  }, [view]);
}

function useMatchLedger(view: TableView | null) {
  const sent = useRef("");
  const [gained, setGained] = useState(0);
  const { user, isPending } = useCurrentUserState();
  useEffect(() => {
    if (!view?.over || !view.winner || !user) {
      if (!view?.over) setGained(0);
      return;
    }
    if (sent.current === view.dealId) return;
    sent.current = view.dealId;
    const result = view.winner === "you" ? "win" : view.winner === "opp" ? "loss" : "tie";
    void recordMatch({ data: { dealId: view.dealId, result } })
      .then((row) => setGained(row.gained))
      .catch(() => {
        sent.current = "";
      });
  }, [view?.over, view?.winner, view?.dealId, user?.id]);
  return { gained, signedIn: Boolean(user), pending: isPending };
}

function TableBoard({
  view,
  youName,
  oppName,
  rosterNames,
  thinking,
  onDraw,
  onLeft,
  onPlay,
  onQuiz,
  onChoose,
  onAbility,
  onNext,
  onStake,
  onRematch,
  onLeave,
  rematchLabel,
  onPause,
  oppUserId,
}: {
  view: TableView | null;
  youName: string;
  oppName: string;
  rosterNames?: string[];
  thinking?: boolean;
  onDraw: () => void;
  onLeft: () => void;
  onPlay: (uid: string) => void;
  onQuiz: () => void;
  onChoose: (choice: number) => void;
  onAbility: (ability: AbilityId, extra?: { mode?: "balance" | "dump"; uid?: string; side?: "self" | "opp"; swap?: string }) => void;
  onNext: () => void;
  onStake: (take: boolean) => void;
  onRematch: () => void;
  onLeave: () => void;
  rematchLabel: string;
  onPause?: (holding: boolean) => void;
  oppUserId?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [oppPick, setOppPick] = useState<string | null>(null);
  const [adjaMine, setAdjaMine] = useState<string | null>(null);
  const [casting, setCasting] = useState<string | null>(null);
  const [friendAdded, setFriendAdded] = useState(false);
  const ledger = useMatchLedger(view);
  const castTimer = useRef<number | null>(null);
  const selectedCard = view?.youHand.find((card) => card.uid === selected) ?? null;
  const last = view?.log.at(-1);
  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;
  const shownKey = view?.shown ? `${view.dealId}:${view.log.length}:${view.shown.name}` : "";
  const [hold, setHold] = useState<{ key: string; until: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  if (shownKey && hold?.key !== shownKey) {
    setHold({ key: shownKey, until: Date.now() + 3000 });
    setNow(Date.now());
  }
  const remaining = hold && hold.key === shownKey ? Math.max(0, hold.until - now) : 0;
  const showing = remaining > 0;
  const busy = showing || casting !== null;
  useEffect(() => {
    return () => {
      if (castTimer.current) window.clearTimeout(castTimer.current);
    };
  }, []);
  function castAbility(ability: AbilityId, extra?: { mode?: "balance" | "dump"; uid?: string; side?: "self" | "opp"; swap?: string }) {
    const uid = selected;
    if (!uid || casting) return;
    setCasting(uid);
    castTimer.current = window.setTimeout(() => {
      setCasting(null);
      setSelected(null);
      onAbility(ability, extra);
    }, 850);
  }
  const canThrowPiece = Boolean(selectedCard?.face === "piece" && view?.canPlay);
  const eyeArmed = Boolean(selectedCard?.ability === "eye" && view?.canAbilities.includes("eye") && !casting);
  const wrapArmed = Boolean(selectedCard?.ability === "wrap" && view?.canAbilities.includes("wrap") && !casting);
  const adjaArmed = Boolean(selectedCard?.ability === "adja" && view?.canAbilities.includes("adja") && !casting);
  const canThrowAbility = Boolean(
    selectedCard?.ability &&
      selectedCard.ability !== "eye" &&
      selectedCard.ability !== "adja" &&
      !(selectedCard.ability === "wrap" && !oppPick) &&
      view?.canAbilities.includes(selectedCard.ability),
  );
  useEffect(() => {
    onPauseRef.current?.(showing);
    if (!showing) return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [showing, shownKey]);

  return (
    <Shell fx={view?.over && view.winner === "opp" ? "curse" : view?.fx}>
      {showing && view?.shown ? (
        <div className={`fx-veil fx-hold ${view.shown.fx ? `fx-${view.shown.fx}` : ""}`} role="dialog" aria-label={view.shown.name}>
          <div>
            {view.shown.image ? (
              <img src={view.shown.image} alt={view.shown.name} decoding="sync" fetchPriority="high" />
            ) : (
              <div className="grid h-80 w-56 place-items-center rounded-card border-2 border-gold bg-sand px-4 text-center text-3xl font-extrabold text-night">
                {view.shown.name}
              </div>
            )}
            <p className="mt-3 text-center text-sm font-extrabold text-sand">{Math.ceil(remaining / 1000)}</p>
          </div>
        </div>
      ) : null}
      <header className="rounded-card border border-gold/40 bg-night/80 px-3 py-2">
        <p className="text-left text-sm font-extrabold text-gold">المجموع: {view?.scoreOpp ?? 0}</p>
        <div className="mb-2 flex justify-center gap-2">
          {[1, 2, 3].slice(0, view?.rounds ?? 3).map((round) => (
            <span
              key={round}
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                view && view.roundNo === round ? "bg-gold text-night" : "border border-gold/40 text-sand/70"
              }`}
            >
              {round}
            </span>
          ))}
        </div>
        {view && rosterNames && view.roster.length > 2 ? (
          <div className="mb-2 flex justify-center gap-3">
            {view.roster.map((player, index) => (
              <div key={`${rosterNames[index] ?? index}`} className="w-14 text-center">
                <span
                  className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-2 text-xs font-extrabold ${
                    player.active ? "border-gold bg-gold/25 text-gold shadow-[0_0_12px_rgba(212,162,74,0.8)]" : "border-sand/30 text-sand/70"
                  }`}
                >
                  {(rosterNames[index] ?? "؟").slice(0, 1)}
                </span>
                <p className={`mt-1 truncate text-[10px] font-bold ${player.you ? "text-gold" : "text-sand/80"}`}>
                  {player.you ? "أنت" : rosterNames[index]}
                </p>
                <p className="text-[10px] font-extrabold text-sand">{player.total}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold">{oppName}</p>
            {thinking ? <p className="text-xs text-sand/80">بيفكر…</p> : null}
          </div>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {view && view.oppSlots.length === 0 ? (
            <p className="text-xs text-sand/70">إيده فاضية</p>
          ) : (
            view?.oppSlots.map((slot) => (
              <div key={slot.uid} className="w-16 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (eyeArmed) castAbility("eye", { side: "opp", uid: slot.uid });
                    else if (adjaArmed && adjaMine) castAbility("adja", { uid: adjaMine, swap: slot.uid });
                    else if (wrapArmed && !slot.frozen) {
                      if (oppPick === slot.uid) castAbility("wrap", { uid: slot.uid });
                      else setOppPick(slot.uid);
                    } else setOppPick(slot.uid);
                  }}
                  className={oppPick === slot.uid || eyeArmed || (adjaArmed && adjaMine) ? "ring-2 ring-gold" : ""}
                >
                  <CardBack label={slot.frozen ? "متجمد" : "كرت الخصم"} frozen={slot.frozen} shield={slot.shield} />
                </button>
              </div>
            ))
          )}
        </div>
      </header>

      <section className="flex flex-1 flex-col justify-center py-3">
        {view?.over ? (
          <div className="rise-in text-center">
            {view.winner === "opp" ? <div className="doom-veil" /> : null}
            <p className="text-xl font-extrabold text-gold">
              {view.winner === "you" ? "لقد فزت بكارت الفرعون" : view.winner === "tie" ? "تعادل" : "حساب أوزير"}
            </p>
            {view.winner === "you" ? (
              <img src="/cover.jpg" alt="كارت الفرعون" className="paradise-card mx-auto mt-3 w-52 rounded-card border-2 border-gold" />
            ) : null}
            {view.winner === "opp" ? (
              <img src="/cards/osiris-card.jpg" alt="حساب أوزير" className="doom-card mx-auto mt-3 w-52 rounded-card border-2 border-carnelian" />
            ) : null}
            {view.note ? <p className="mt-3 text-sm font-bold">{view.note}</p> : null}
            {ledger.gained > 0 ? (
              <p className="mt-2 flex items-center justify-center gap-2 text-sm font-extrabold text-gain">
                <img src="/art/cartouche.jpg" alt="" className="h-6 w-6 rounded-full border border-gold object-cover" />
                +{ledger.gained} خرطوش
              </p>
            ) : null}
            {!ledger.pending && !ledger.signedIn ? (
              <p className="mt-2 text-xs font-bold text-sand/70">الخرطوش بيتسجل لما تعمل حساب.</p>
            ) : null}
            {oppUserId ? (
              <button
                type="button"
                disabled={friendAdded}
                className="mx-auto mt-3 block rounded-card border border-gold px-4 py-2 text-sm font-extrabold text-gold disabled:opacity-40"
                onClick={() => {
                  void addCourtFriend({ data: oppUserId }).then((result) => {
                    if (result.ok) setFriendAdded(true);
                  });
                }}
              >
                {friendAdded ? "اتضاف في صحابك" : "أضف صاحبك"}
              </button>
            ) : null}
          </div>
        ) : null}

        {view && !view.over ? (
          <div className="rise-in mx-auto w-full max-w-lg">
            <p className="mb-2 text-center text-sm font-extrabold text-gold">
              {view.turn === "you"
                ? "دورك"
                : `دور ${rosterNames?.[view.roster.findIndex((player) => player.active)] || oppName}`}
            </p>
            <div dir="ltr" className="flex items-stretch gap-2">
              <button type="button" onClick={onLeft} disabled={showing || !view.canLeft} className={`w-16 shrink-0 ${view.canLeft && !showing ? "hot-pile" : "opacity-80"}`}>
                <CardBack label="ورق البردية" className={view.canLeft ? "ring-2 ring-gain" : ""} />
                <span className="mt-1 block text-center text-xs font-extrabold text-sand">البردية {view.leftLeft}</span>
              </button>
              <article dir="rtl" className="min-h-36 flex-1 rounded-card border-2 border-gold bg-sand p-3 text-night">
                {view.glyphs ? <p className="glyphs mb-2 text-center text-night">{view.glyphs}</p> : null}
                <p className="text-sm font-extrabold leading-snug">
                  {view.stem ||
                    (view.step === "between"
                      ? "الراوند خلص."
                      : view.turn === "you"
                        ? "اسحب من ورق الفزورة على اليمين."
                        : `${rosterNames?.[view.roster.findIndex((player) => player.active)] || oppName} بيلعب.`)}
                </p>
                {view.carried ? <p className="mt-2 text-xs font-bold text-carnelian">نفس الفزورة، ما اتحلتش</p> : null}
                {view.step === "papyrus" && view.turn === "you" ? (
                  <p className="mt-2 text-xs font-bold text-lapis">الأمر: اسحب ورق البردية.</p>
                ) : null}
              </article>
              <button type="button" onClick={onDraw} disabled={showing || !view.canDraw} className={`w-16 shrink-0 ${view.canDraw && !showing ? "hot-pile" : "opacity-80"}`}>
                <CardBack label="ورق الفزورة" className={view.canDraw ? "ring-2 ring-gold" : ""} />
                <span className="mt-1 block text-center text-xs font-extrabold text-sand">الفزورة {view.rightLeft}</span>
              </button>
            </div>
            {view.quiz ? (
              <div className="mt-3 space-y-2">
                {view.quiz.glyphs ? <p className="glyphs text-center">{view.quiz.glyphs}</p> : null}
                <p className="text-sm font-bold text-gold">{view.quiz.q}</p>
                {view.quiz.options.map((option, index) => (
                  <button
                    key={`${option}-${index}`}
                    type="button"
                    onClick={() => onChoose(index)}
                    disabled={showing}
                    className="min-h-12 w-full rounded-card border-2 border-gold bg-night/80 px-3 py-2 text-sm font-bold text-sand"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
            {view.note && view.step !== "between" ? (
              <p className={`mt-3 text-center text-sm font-extrabold ${deltaClass(view.turn === "you" ? view.lastDeltaYou : view.lastDeltaOpp)}`}>
                {view.note}
              </p>
            ) : null}
            {view.peek ? <p className="mt-2 text-center text-sm font-bold text-gold">شفت: {view.peek}</p> : null}
            {last && view.step === "draw" ? (
              <p className={`mt-2 text-center text-xs ${deltaClass(last.delta)}`}>
                {last.who === "you" ? "أنت" : oppName}: {last.text}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {view?.over ? (
        <div className="space-y-2">
          <GoldButton onClick={onRematch}>{rematchLabel}</GoldButton>
          <GhostButton onClick={onLeave}>ارجع</GhostButton>
        </div>
      ) : (
        <footer className="rounded-card border border-gold/40 bg-night/80 p-3">
          <p className="text-left text-sm font-extrabold text-gold">المجموع: {view?.scoreYou ?? 0}</p>
          <div className="mb-2 mt-1 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gold">تحت · أنت</p>
              <p className="font-extrabold">{youName}</p>
            </div>
          </div>
          {view && !view.over ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {view.youHand.map((card) => (
                <div key={card.uid} className="w-24 shrink-0">
                  <CardView
                    card={card}
                    selected={selected === card.uid || adjaMine === card.uid}
                    casting={casting === card.uid}
                    onSelect={
                      card.frozen || casting
                        ? undefined
                        : () => {
                            if (eyeArmed && card.face === "down") {
                              castAbility("eye", { side: "self", uid: card.uid });
                              return;
                            }
                            if (adjaArmed && card.uid !== selected) {
                              setAdjaMine(card.uid);
                              return;
                            }
                            setAdjaMine(null);
                            setSelected(card.uid);
                          }
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
          {view?.canDraw ? (
            <div className="mt-2">
              <GoldButton onClick={onDraw} disabled={busy}>اسحب ورق الفزورة</GoldButton>
            </div>
          ) : null}
          {view?.canLeft ? (
            <div className="mt-2">
              <GoldButton onClick={onLeft} disabled={busy}>اسحب ورق البردية</GoldButton>
            </div>
          ) : null}
          {view && !view.over ? (
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy || !(canThrowPiece || canThrowAbility)}
                onClick={() => {
                  if (canThrowPiece && selectedCard) onPlay(selectedCard.uid);
                  else if (canThrowAbility && selectedCard?.ability) {
                    const ability = selectedCard.ability;
                    if (ability === "maat") castAbility(ability, { mode: "balance" });
                    else if (ability === "wrap") castAbility(ability, { uid: oppPick ?? undefined });
                    else castAbility(ability);
                  }
                }}
                className={`h-12 w-full rounded-card text-base font-extrabold disabled:cursor-not-allowed ${
                  canThrowPiece || canThrowAbility ? "bg-gold text-night" : "border-2 border-gold/30 bg-night/40 text-sand/40"
                }`}
              >
                ارمي الكارت دا
              </button>
              <GhostButton onClick={onQuiz} disabled={busy || !view.canQuiz}>
                اسألني أحسن
              </GhostButton>
            </div>
          ) : null}
          {selectedCard?.ability && view?.canAbilities.includes(selectedCard.ability) ? (
            <div className="mt-2 flex flex-col gap-2">
              {selectedCard.ability === "maat" ? (
                <>
                  <GoldButton onClick={() => castAbility("maat", { mode: "balance" })} disabled={busy}>ماعت: وازن النقاط</GoldButton>
                  <GhostButton onClick={() => castAbility("maat", { mode: "dump", uid: oppPick ?? undefined })} disabled={busy}>ماعت: ارمي أعلى كرت</GhostButton>
                </>
              ) : selectedCard.ability === "eye" ? (
                <p className="text-center text-xs font-bold text-gold">قبل سحب الفزورة: دوس على كرتك المقلوب، أو على كارت الخصم. الاسم يظهرلك أنت بس.</p>
              ) : selectedCard.ability === "adja" ? (
                <p className="text-center text-xs font-bold text-gold">
                  {adjaMine ? "دلوقتي دوس على كارت الخصم، من غير ما تشوفه." : "دوس الأول على كارت من كروتِك."}
                </p>
              ) : selectedCard.ability === "wrap" ? (
                <p className="text-center text-xs font-bold text-gold">اختار كارت الخصم، ودوس عليه تاني عشان يتحنط.</p>
              ) : (
                <GoldButton
                  disabled={busy}
                  onClick={() =>
                    castAbility(selectedCard.ability as AbilityId, {
                      uid: selectedCard.ability === "wrap" ? oppPick ?? undefined : undefined,
                    })
                  }
                >
                  استخدم {selectedCard.name}
                </GoldButton>
              )}
            </div>
          ) : null}
          {view?.canNext ? (
            <div className="mt-2">
              <GoldButton onClick={onNext} disabled={showing}>الجولة الجاية</GoldButton>
            </div>
          ) : null}
          {view?.canStake ? (
            <div className="mt-2 flex flex-col gap-2">
              <GoldButton onClick={() => onStake(true)} disabled={showing}>تحدي الفرعون</GoldButton>
              <GhostButton onClick={() => onStake(false)} disabled={showing}>كمّل من غير تحدي</GhostButton>
            </div>
          ) : null}
          <button type="button" onClick={onLeave} className="mt-2 h-10 w-full text-sm font-bold text-sand/80">
            اخرج
          </button>
        </footer>
      )}
    </Shell>
  );
}

function OnlineMatch({
  room,
  name,
  isHost,
  onLeave,
}: {
  room: string;
  name: string;
  isHost: boolean;
  onLeave: () => void;
}) {
  const p2p = usePublicRoom({ room, name });
  const { send, onMessage, peers, joined, trouble } = p2p;
  const [book, setBook] = useState<Book | null>(null);
  const [guestView, setGuestView] = useState<TableView | null>(null);
  const [copied, setCopied] = useState(false);
  const [oppUserId, setOppUserId] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  const { user } = useCurrentUserState();
  const bookRef = useRef<Book | null>(null);
  bookRef.current = book;
  const mate = peers.find((peer) => peer.connectionState === "connected") ?? peers[0];
  const linked = mate?.connectionState === "connected";
  const oppName = mate?.name?.trim() || "صاحبك";
  const view = isHost && book ? viewOf(book, "a") : guestView;
  useFx(view);

  useEffect(() => {
    setInApp(insideAndroidApp());
  }, []);

  useEffect(() => {
    return onMessage((from, data) => {
      const client = readClient(data);
      if (client?.t === "who") {
        setOppUserId(client.userId);
        return;
      }
      if (isHost) {
        if (!client) return;
        if (client.t === "hello") {
          const current = bookRef.current;
          if (current) send({ t: "state", view: viewOf(current, "b") }, from);
          return;
        }
        setBook((current) => (current ? applyGuest(current, client) : current));
        return;
      }
      const next = readView(data);
      if (next) setGuestView(next);
    });
  }, [isHost, onMessage, send]);

  useEffect(() => {
    if (!linked || !user?.id) return;
    const ping = () => send({ t: "who", userId: user.id }, mate?.id);
    ping();
    const timer = window.setInterval(ping, 2000);
    return () => window.clearInterval(timer);
  }, [linked, user?.id, mate?.id, send]);

  useEffect(() => {
    if (!isHost || !linked || book) return;
    setBook(dealMatch(makeCode()));
  }, [isHost, linked, book]);

  useEffect(() => {
    if (!isHost || !linked || !book) return;
    const push = () => {
      if (bookRef.current) send({ t: "state", view: viewOf(bookRef.current, "b") }, mate?.id);
    };
    push();
    const timer = window.setInterval(push, 1200);
    return () => window.clearInterval(timer);
  }, [isHost, linked, book, mate?.id, send]);

  useEffect(() => {
    if (isHost || !linked || guestView) return;
    const timer = window.setInterval(() => send({ t: "hello" }, mate?.id), 800);
    return () => window.clearInterval(timer);
  }, [isHost, linked, guestView, mate?.id, send]);

  function hostOrSend(seatA: (current: Book) => Book, msg: ClientMsg) {
    if (isHost) setBook((current) => (current ? seatA(current) : current));
    else send(msg, mate?.id);
  }

  const status = !joined
    ? "بنتصل بالروم…"
    : trouble && !mate
      ? "الربط وقف. افتحوا اللينك تاني."
      : !mate
        ? "مستني صاحبك على نفس اللينك"
        : !linked
          ? `${oppName} دخل`
          : `${oppName} على الطاولة`;

  if (!linked || !view) {
    return (
      <Shell>
        <div className="rise-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center text-center">
          <p className="text-sm font-bold text-gold">{isHost ? "اللينك" : "نفس الروم"}</p>
          <p className="mt-2 break-all text-sm">{shareUrl(room)}</p>
          <p className="mt-2 text-xs text-sand/70">اللينك يفتح نفس اللعبة عند صاحبك لو التطبيق موجود، ولو مش موجود يلعب من الموقع.</p>
          <p className="mt-3 text-sm">{status}</p>
          {isHost ? (
            <div className="mt-4">
              <GoldButton
                onClick={() => {
                  void navigator.clipboard?.writeText(shareUrl(room));
                  setCopied(true);
                }}
              >
                {copied ? "اللينك اتنسخ" : "انسخ اللينك"}
              </GoldButton>
            </div>
          ) : null}
          {!inApp ? (
            <div className="mt-3">
              <GhostButton
                onClick={() => {
                  if (!/Android/i.test(navigator.userAgent)) return;
                  window.location.href = appDeepLink(room);
                }}
              >
                افتح في التطبيق
              </GhostButton>
            </div>
          ) : null}
          <div className="mt-3">
            <GhostButton onClick={onLeave}>ارجع</GhostButton>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <TableBoard
      view={view}
      youName={name}
      oppName={oppName}
      onDraw={() => {
        playLock();
        hostOrSend((current) => drawRight(current, "a"), { t: "draw" });
      }}
      onLeft={() => {
        playLock();
        hostOrSend((current) => drawLeft(current, "a"), { t: "left" });
      }}
      onPlay={(uid) => {
        playLock();
        hostOrSend((current) => playCard(current, "a", uid), { t: "play", cardId: uid });
      }}
      onQuiz={() => hostOrSend((current) => openQuiz(current, "a"), { t: "quiz-open" })}
      onChoose={(choice) => {
        playLock();
        hostOrSend(
          (current) => (current.step === "stakeQuiz" ? answerStake(current, "a", choice) : answerQuiz(current, "a", choice)),
          { t: "quiz", choice },
        );
      }}
      onAbility={(ability, extra) =>
        hostOrSend((current) => playAbility(current, "a", ability, extra), { t: "ability", ability, ...extra })
      }
      onNext={() => hostOrSend((current) => nextRound(current, "a"), { t: "next" })}
      onStake={(take) => hostOrSend((current) => (take ? startStake(current, "a") : skipStake(current, "a")), { t: "stake", take })}
      onRematch={() => {
        if (isHost) setBook(dealMatch(makeCode()));
        else send({ t: "rematch" }, mate?.id);
      }}
      onLeave={onLeave}
      rematchLabel="توزيع جديد"
      oppUserId={oppUserId ?? undefined}
    />
  );
}

function SoloMatch({ name, rounds, onLeave }: { name: string; rounds: 1 | 3; onLeave: () => void }) {
  const [book, setBook] = useState<Book | null>(null);
  const [thinking, setThinking] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    setBook(dealMatch(makeCode(), Math.random, rounds));
  }, [rounds]);
  const view = book ? viewOf(book, "a") : null;
  useFx(view);

  useEffect(() => {
    if (!book || book.turn !== "b" || book.over || book.step === "between" || paused) {
      if (paused) setThinking(false);
      return;
    }
    setThinking(true);
    const drawing = book.step === "draw";
    const papyrus = book.step === "papyrus";
    const wait = drawing ? 1000 : papyrus ? 2000 : (Math.floor(Math.random() * 6) + 5) * 1000;
    const timer = window.setTimeout(() => {
      setBook((current) => {
        if (!current || current.turn !== "b") return current;
        return aiAct(current, Math.random) ?? current;
      });
      setThinking(false);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [book, paused]);

  if (!view || !book) {
    return (
      <Shell>
        <p className="mt-16 text-center text-sm">الفرعون بيدخل المعبد…</p>
      </Shell>
    );
  }

  return (
    <TableBoard
      view={view}
      youName={name}
      oppName="الفرعون"
      thinking={thinking}
      onDraw={() => {
        playLock();
        setBook((current) => (current ? drawRight(current, "a") : current));
      }}
      onLeft={() => {
        playLock();
        setBook((current) => (current ? drawLeft(current, "a") : current));
      }}
      onPlay={(uid) => {
        playLock();
        setBook((current) => (current ? playCard(current, "a", uid) : current));
      }}
      onQuiz={() => setBook((current) => (current ? openQuiz(current, "a") : current))}
      onChoose={(choice) => {
        playLock();
        setBook((current) =>
          current ? (current.step === "stakeQuiz" ? answerStake(current, "a", choice) : answerQuiz(current, "a", choice)) : current,
        );
      }}
      onAbility={(ability, extra) => setBook((current) => (current ? playAbility(current, "a", ability, extra) : current))}
      onNext={() => setBook((current) => (current ? nextRound(current, "a") : current))}
      onStake={(take) => setBook((current) => (current ? (take ? startStake(current, "a") : skipStake(current, "a")) : current))}
      onRematch={() => setBook(dealMatch(makeCode(), Math.random, rounds))}
      onLeave={onLeave}
      rematchLabel="لعبة جديدة"
      onPause={setPaused}
    />
  );
}

const PARTY_SEATS: Seat[] = ["a", "b", "c", "d"];

function PartyLobby({
  room,
  name,
  onLive,
  onLeave,
}: {
  room: string;
  name: string;
  onLive: (slots: PartySlot[]) => void;
  onLeave: () => void;
}) {
  const [slots, setSlots] = useState<PartySlot[]>([null, null, null, null]);
  const [host, setHost] = useState(false);
  const [friends, setFriends] = useState<{ id: string; name: string; online: boolean }[]>([]);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const liveRef = useRef(onLive);
  const leaveRef = useRef(onLeave);
  const started = useRef(false);
  liveRef.current = onLive;
  leaveRef.current = onLeave;

  useEffect(() => {
    let stop = false;
    void joinParty({ data: { room, name } }).catch(() => undefined);
    const pull = () => {
      void loadParty({ data: room })
        .then((next) => {
          if (stop) return;
          setSlots(next.slots);
          setHost(next.host);
          if (next.status === "live" && !started.current) {
            started.current = true;
            liveRef.current(next.slots);
          }
          if (next.status === "done") leaveRef.current();
        })
        .catch(() => undefined);
    };
    pull();
    const timer = window.setInterval(pull, 2000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [room, name]);

  useEffect(() => {
    if (!adding) return;
    void loadCourt()
      .then((court) => setFriends(court.friends))
      .catch(() => undefined);
  }, [adding]);

  const filled = slots.filter(Boolean).length;
  const taken = new Set(slots.flatMap((slot) => (slot ? [slot.userId] : [])));

  return (
    <Shell>
      <div className="rise-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <h1 className="text-center text-2xl font-extrabold">لعب جماعي</h1>
        <p className="mt-2 text-center text-sm text-sand/80">أونلاين، من ٢ لحد ٤. اللي عليه الدور يلعب.</p>
        <div className="mt-6 flex justify-center gap-3">
          {slots.map((slot, index) => (
            <div key={index} className="w-16 text-center">
              <span
                className={`mx-auto grid h-16 w-16 place-items-center rounded-full border-2 text-sm font-extrabold ${
                  slot
                    ? "border-gold bg-gold/20 text-gold shadow-[0_0_16px_rgba(212,162,74,0.75)]"
                    : "border-dashed border-sand/30 text-sand/40"
                }`}
              >
                {slot ? slot.name.slice(0, 1) : ""}
              </span>
              <p className="mt-2 truncate text-xs font-bold text-sand">{slot ? slot.name : "فاضي"}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm font-bold text-sand/80">
          {filled < 2 ? "مستنيين لاعب تاني على الأقل." : host ? "تقدر تبدأ، أو تضيف لحد ما الدواير تكمّل." : "مستنيين صاحب الروم يبدأ."}
        </p>
        {host ? (
          <div className="mt-4 flex flex-col gap-3">
            <GoldButton
              disabled={filled < 2}
              onClick={() => {
                void startParty({ data: room }).then((result) => {
                  if (!result.ok) setNote("لسه محتاجين لاعب تاني.");
                });
              }}
            >
              ابدأ اللعب
            </GoldButton>
            <GhostButton onClick={() => setAdding((value) => !value)}>{adding ? "اقفل الإضافة" : "أضف لاعب"}</GhostButton>
            {adding
              ? friends
                  .filter((friend) => friend.online && !taken.has(friend.id))
                  .map((friend) => (
                    <button
                      key={friend.id}
                      type="button"
                      className="rounded-card border border-gold px-3 py-2 text-sm font-extrabold text-gold"
                      onClick={() => {
                        void inviteCourtFriend({ data: friend.id }).then((result) => {
                          if (result.busy) setNote(result.self ? "أنت في جيم دلوقتي" : "في جيم دلوقتي");
                          else if (result.full) setNote("الروم اتملت.");
                          else if (!result.room) setNote("الدعوة ما اتبعتتش.");
                          else setNote(`دعوة ${friend.name} اتبعتت.`);
                        });
                      }}
                    >
                      أضف {friend.name}
                    </button>
                  ))
              : null}
          </div>
        ) : null}
        {note ? <p className="mt-3 text-center text-sm font-extrabold text-gain">{note}</p> : null}
        <div className="mt-3">
          <GhostButton onClick={onLeave}>ارجع</GhostButton>
        </div>
      </div>
    </Shell>
  );
}

function PartyMatch({
  room,
  name,
  host,
  slots,
  onLeave,
}: {
  room: string;
  name: string;
  host: boolean;
  slots: PartySlot[];
  onLeave: () => void;
}) {
  const players = slots
    .filter((slot): slot is { userId: string; name: string } => Boolean(slot))
    .map((slot, index) => ({ ...slot, seat: PARTY_SEATS[index] ?? "a" }));
  const count = Math.min(4, Math.max(2, players.length));
  const p2p = usePublicRoom({ room, name });
  const { send, onMessage, peers } = p2p;
  const [book, setBook] = useState<Book | null>(null);
  const [guestView, setGuestView] = useState<TableView | null>(null);
  const [names, setNames] = useState<string[]>(() => players.map((player) => player.name));
  const [peerSeat, setPeerSeat] = useState<Record<string, Seat>>({});
  const { user } = useCurrentUserState();
  const bookRef = useRef<Book | null>(null);
  const playersRef = useRef(players);
  const peerSeatRef = useRef(peerSeat);
  bookRef.current = book;
  playersRef.current = players;
  peerSeatRef.current = peerSeat;
  const me = players.find((player) => player.userId === user?.id) ?? players[0];
  const seat = me?.seat ?? "a";
  const myIndex = Math.max(0, players.findIndex((player) => player.seat === seat));
  const next = players[(myIndex + 1) % Math.max(players.length, 1)];
  const view = host && book ? viewOf(book, seat) : guestView;
  useFx(view);

  useEffect(() => {
    return onMessage((from, data) => {
      const table = playersRef.current;
      const client = readClient(data);
      if (client?.t === "who") {
        const known = table.find((player) => player.userId === client.userId);
        if (known) setPeerSeat((current) => (current[from] === known.seat ? current : { ...current, [from]: known.seat }));
        return;
      }
      if (host) {
        if (!client) return;
        const fromSeat = peerSeatRef.current[from];
        if (client.t === "hello") {
          const current = bookRef.current;
          if (current && fromSeat) send({ t: "state", view: viewOf(current, fromSeat), names: table.map((player) => player.name) }, from);
          return;
        }
        if (!fromSeat) return;
        setBook((current) => (current ? applySeat(current, fromSeat, client) : current));
        return;
      }
      const nextState = readState(data);
      if (nextState) {
        setGuestView(nextState.view);
        if (nextState.names.length > 0) setNames(nextState.names);
      }
    });
  }, [host, onMessage, send]);

  useEffect(() => {
    if (!user?.id) return;
    const ping = () => {
      for (const peer of peers) send({ t: "who", userId: user.id }, peer.id);
    };
    ping();
    const timer = window.setInterval(ping, 2000);
    return () => window.clearInterval(timer);
  }, [user?.id, peers, send]);

  useEffect(() => {
    if (!host || book) return;
    setBook(dealMatch(makeCode(), Math.random, 3, count));
  }, [host, book, count]);

  useEffect(() => {
    if (!host || !book) return;
    const push = () => {
      const current = bookRef.current;
      if (!current) return;
      const table = playersRef.current;
      const tableNames = table.map((player) => player.name);
      for (const peer of peers) {
        const target = peerSeatRef.current[peer.id];
        if (!target) continue;
        send({ t: "state", view: viewOf(current, target), names: tableNames }, peer.id);
      }
    };
    push();
    const timer = window.setInterval(push, 1200);
    return () => window.clearInterval(timer);
  }, [host, book, peers, peerSeat, send]);

  useEffect(() => {
    if (host || guestView) return;
    const timer = window.setInterval(() => {
      for (const peer of peers) send({ t: "hello" }, peer.id);
    }, 800);
    return () => window.clearInterval(timer);
  }, [host, guestView, peers, send]);

  function act(local: (current: Book) => Book, msg: ClientMsg) {
    if (host) setBook((current) => (current ? local(current) : current));
    else {
      for (const peer of peers) send(msg, peer.id);
    }
  }

  if (!view) {
    return (
      <Shell>
        <div className="rise-in mx-auto flex w-full max-w-md flex-1 flex-col justify-center text-center">
          <p className="text-sm font-bold text-gold">الجيم بدأ</p>
          <p className="mt-3 text-sm">بنتصل بالباقي…</p>
          <div className="mt-3">
            <GhostButton onClick={onLeave}>ارجع</GhostButton>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <TableBoard
      view={view}
      youName={name}
      oppName={next?.name || "اللي بعده"}
      rosterNames={host ? players.map((player) => player.name) : names}
      onDraw={() => {
        playLock();
        act((current) => drawRight(current, seat), { t: "draw" });
      }}
      onLeft={() => {
        playLock();
        act((current) => drawLeft(current, seat), { t: "left" });
      }}
      onPlay={(uid) => {
        playLock();
        act((current) => playCard(current, seat, uid), { t: "play", cardId: uid });
      }}
      onQuiz={() => act((current) => openQuiz(current, seat), { t: "quiz-open" })}
      onChoose={(choice) => {
        playLock();
        act(
          (current) => (current.step === "stakeQuiz" ? answerStake(current, seat, choice) : answerQuiz(current, seat, choice)),
          { t: "quiz", choice },
        );
      }}
      onAbility={(ability, extra) => act((current) => playAbility(current, seat, ability, extra), { t: "ability", ability, ...extra })}
      onNext={() => act((current) => nextRound(current, seat), { t: "next" })}
      onStake={(take) => act((current) => (take ? startStake(current, seat) : skipStake(current, seat)), { t: "stake", take })}
      onRematch={() => {
        if (host) setBook(dealMatch(makeCode(), Math.random, 3, count));
        else for (const peer of peers) send({ t: "rematch" }, peer.id);
      }}
      onLeave={onLeave}
      rematchLabel="توزيع جديد"
    />
  );
}

export function ThroneApp() {
  const pathRoom = useRouterState({
    select: (state) => /^\/r\/([A-Za-z0-9_-]{1,64})$/.exec(state.location.pathname)?.[1] ?? null,
  });
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState<string | null>(pathRoom);
  const [isHost, setIsHost] = useState(false);
  const [active, setActive] = useState(false);
  const [solo, setSolo] = useState(false);
  const [party, setParty] = useState<{ room: string; host: boolean; slots: PartySlot[] } | null>(null);
  const [partyLive, setPartyLive] = useState(false);
  const [soloRounds, setSoloRounds] = useState<1 | 3 | null>(null);
  const [rules, setRules] = useState(false);
  const [ad, setAd] = useState(false);
  const online = useOnline();
  const nativeApp = useNativeApp();
  const apkHref = useApkHref();
  const [gameOrigin, setGameOrigin] = useState("");
  const [hostName, setHostName] = useState("");
  const [inApp, setInApp] = useState(false);
  const [appHint, setAppHint] = useState("");
  const [courtReady, setCourtReady] = useState(false);
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    setCourtReady(true);
    const host = window.location.hostname;
    setHostName(host);
    setInApp(insideAndroidApp());
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    const onLiveSite = Boolean(host && host !== "localhost" && host !== "127.0.0.1");
    if (cap?.isNativePlatform?.() && onLiveSite) setGameOrigin(writeGameOrigin(window.location.origin));
    else setGameOrigin(readGameOrigin() || bakedGameOrigin());
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const beat = () => {
      void loadCourt().catch(() => undefined);
    };
    beat();
    const timer = window.setInterval(beat, 20000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  useEffect(() => {
    if (!pathRoom || insideAndroidApp()) return;
    if (!/Android/i.test(window.navigator.userAgent)) return;
    const key = `kart-app-tried:${pathRoom}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    const deep = appDeepLink(pathRoom).replace(/^kartelfer3on:\/\//, "");
    const fallback = window.location.href;
    window.location.href = `intent://${deep}#Intent;scheme=kartelfer3on;package=com.kartelfer3on.game;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
  }, [pathRoom]);

  useEffect(() => {
    const saved = window.localStorage.getItem(NAME_KEY) ?? "";
    setName(saved);
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    if (!pathRoom && queryRoom && /^[a-zA-Z0-9_-]{1,64}$/.test(queryRoom)) {
      void navigate({ to: "/r/$code", params: { code: queryRoom }, replace: true });
      return;
    }
    if (!pathRoom) return;
    setRoomCode(pathRoom);
    const host = window.sessionStorage.getItem(hostKey(pathRoom)) === "1";
    setIsHost(host);
    if (host && saved.trim()) setActive(true);
  }, [pathRoom, navigate]);

  function remember(next: string) {
    setName(next);
    window.localStorage.setItem(NAME_KEY, next);
  }

  function leave() {
    if (roomCode) window.sessionStorage.removeItem(hostKey(roomCode));
    setActive(false);
    setSolo(false);
    setSoloRounds(null);
    setIsHost(false);
    setRoomCode(null);
    if (party) void leaveParty({ data: party.room }).catch(() => undefined);
    setParty(null);
    setPartyLive(false);
    void navigate({ to: "/", search: { room: undefined } });
  }

  function enterRoom(room: string, host: boolean, mode?: "party") {
    if (!online || !name.trim() || shellOnly) return;
    if (mode === "party") {
      setParty({ room, host, slots: [null, null, null, null] });
      setPartyLive(false);
      return;
    }
    if (host) window.sessionStorage.setItem(hostKey(room), "1");
    else window.sessionStorage.removeItem(hostKey(room));
    setRoomCode(room);
    setIsHost(host);
    setActive(true);
    void navigate({ to: "/r/$code", params: { code: room } });
  }

  function createRoom() {
    enterRoom(makeCode(), true);
  }

  useEffect(() => {
    setCourtBridge({ playName: name, onPlay: enterRoom, onNamed: remember });
  });

  function openInstalledApp(room?: string) {
    if (!/Android/i.test(navigator.userAgent)) {
      setAppHint("من موبايل أندرويد الزر يفتح اللعبة نفسها، واللينك يفضل شغال في الخلفية.");
      return;
    }
    window.location.href = appDeepLink(room);
  }

  const onLiveSite = hostName !== "" && hostName !== "localhost" && hostName !== "127.0.0.1";
  const shellOnly = nativeApp && !gameOrigin && !onLiveSite;

  if (solo && soloRounds && name.trim()) {
    return (
      <SoloMatch
        name={name.trim()}
        rounds={soloRounds}
        onLeave={() => {
          setSolo(false);
          setSoloRounds(null);
        }}
      />
    );
  }

  if (solo && name.trim()) {
    return (
      <Shell>
        <div className="rise-in mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3">
          <h1 className="text-center text-2xl font-extrabold">إلعب مع الفرعون</h1>
          <GoldButton onClick={() => setSoloRounds(1)}>جولة سريعة</GoldButton>
          <GoldButton onClick={() => setSoloRounds(3)}>٣ جولات</GoldButton>
          <GhostButton
            onClick={() => {
              setSolo(false);
              setSoloRounds(null);
            }}
          >
            رجوع
          </GhostButton>
        </div>
      </Shell>
    );
  }

  if (party && name.trim()) {
    if (!partyLive) {
      return (
        <PartyLobby
          room={party.room}
          name={name.trim()}
          onLive={(slots) => {
            setParty((current) => (current ? { ...current, slots } : current));
            setPartyLive(true);
          }}
          onLeave={leave}
        />
      );
    }
    return (
      <PartyMatch
        room={party.room}
        name={name.trim()}
        host={party.host}
        slots={party.slots}
        onLeave={leave}
      />
    );
  }

  if (active && (roomCode ?? pathRoom) && name.trim()) {
    const code = roomCode ?? pathRoom ?? "";
    return (
      <OnlineMatch
        key={`${code}:${name.trim()}:${isHost}`}
        room={code}
        name={name.trim()}
        isHost={isHost}
        onLeave={leave}
      />
    );
  }

  if (rules) {
    return (
      <Shell>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">قواعد اللعبة</h1>
          <button type="button" className="text-sm font-bold text-gold" onClick={() => setRules(false)}>
            رجوع
          </button>
        </div>
        <Rules />
      </Shell>
    );
  }

  if (ad && online) return <FanoosAd onBack={() => setAd(false)} />;

  const invited = Boolean(pathRoom) && !isHost;
  return (
    <Shell>
      <div className="rise-in mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <img src="/cover.jpg" alt="كارت الفرعون" className="mx-auto h-56 w-auto rounded-card border-2 border-gold object-contain shadow-lg" />
        <h1 className="mt-4 text-center text-4xl font-extrabold">كارت الفرعون</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-sand/80">
          {invited
            ? "اكتب اسمك وادخل الروم. من غير ما تعمل روم جديد."
            : "ورق الفزورة يمين، ورق البردية شمال. ٣ جولات، والأعلى ياخد الكارت."}
        </p>
        <label className="mt-6 text-sm font-bold" htmlFor="player-name">
          اكتب اسمك
        </label>
        <input
          id="player-name"
          value={name}
          maxLength={18}
          onChange={(event) => remember(event.target.value)}
          className="mt-2 h-12 rounded-card border-2 border-gold bg-sand px-3 text-base font-bold text-night"
          placeholder="اكتب اسمك"
        />
        {!courtReady || isPending ? (
          <div className="mt-4 h-12 animate-pulse rounded-card bg-night/40" />
        ) : user ? null : (
          <Link
            to="/login"
            className="mt-4 grid h-12 w-full place-items-center rounded-card border-2 border-gold bg-night/70 text-base font-bold text-sand"
          >
            انشاء حساب
          </Link>
        )}
        <div className="mt-4 flex flex-col gap-3">
          {invited ? (
            <GoldButton onClick={() => pathRoom && enterRoom(pathRoom, false)} disabled={!online || !name.trim() || shellOnly}>
              دخول الروم
            </GoldButton>
          ) : (
            <>
              {online && !shellOnly ? (
                <GoldButton onClick={createRoom} disabled={!name.trim()}>
                  انشاء غرفة
                </GoldButton>
              ) : null}
              {online && !shellOnly && user ? (
                <GoldButton
                  onClick={() => {
                    if (!name.trim()) return;
                    void openParty({ data: { name: name.trim() } }).then((result) => {
                      if (result.busy) return;
                      if (result.room) enterRoom(result.room, true, "party");
                    });
                  }}
                  disabled={!name.trim()}
                >
                  لعب جماعي
                </GoldButton>
              ) : null}
              <GhostButton
                onClick={() => {
                  if (!name.trim()) return;
                  setSolo(true);
                }}
                disabled={!name.trim()}
              >
                إلعب مع الفرعون
              </GhostButton>
            </>
          )}
          {shellOnly ? (
            <p className="text-center text-xs font-bold text-sand/70">
              عشان الغرفة تشتغل من التطبيق، افتح الموقع مرة واضغط «افتح في التطبيق». من غير نت تلعب مع الفرعون بس.
            </p>
          ) : null}
          {!online ? (
            <p className="text-center text-xs font-bold text-sand/70">من غير نت تلعب مع الفرعون بس. الغرفة والإعلان محتاجين نت.</p>
          ) : null}
          <GhostButton onClick={() => setRules(true)}>قواعد اللعبة</GhostButton>
          {online ? (
            <GhostButton
              onClick={() => {
                themeHeld = true;
                themeSong()?.pause();
                setAd(true);
              }}
            >
              اعلان فانوس
            </GhostButton>
          ) : null}
          {!nativeApp ? (
            <a
              href={apkHref}
              download="كارت-الفرعون.apk"
              className="grid h-12 w-full place-items-center rounded-card border-2 border-gold bg-night/70 text-base font-bold text-sand"
            >
              حمّل اللعبة على الموبايل
            </a>
          ) : null}
          {!inApp && online ? (
            <button
              type="button"
              onClick={() => openInstalledApp(pathRoom ?? undefined)}
              className="grid h-12 w-full place-items-center rounded-card border-2 border-gold bg-night/70 text-base font-bold text-sand"
            >
              افتح في التطبيق
            </button>
          ) : null}
          {appHint ? <p className="text-center text-xs font-bold text-sand/70">{appHint}</p> : null}
          <a
            href={SITRA}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-12 w-full place-items-center rounded-card border-2 border-gold bg-night/70 text-base font-bold text-sand"
          >
            سِطرا
          </a>
        </div>
      </div>
    </Shell>
  );
}
