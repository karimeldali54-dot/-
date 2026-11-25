import { useEffect, useRef, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addCourtFriend,
  answerCourtInvite,
  findCourtPlayers,
  inviteCourtFriend,
  loadCourt,
  saveCourtName,
  type CourtSnapshot,
} from "@/lib/court/server";

type CourtBridge = {
  playName: string;
  onPlay: (room: string, host: boolean, mode?: "party") => void;
  onNamed: (name: string) => void;
};

const courtBridge: CourtBridge = {
  playName: "",
  onPlay: () => undefined,
  onNamed: () => undefined,
};

export function setCourtBridge(next: CourtBridge) {
  courtBridge.playName = next.playName;
  courtBridge.onPlay = next.onPlay;
  courtBridge.onNamed = next.onNamed;
}

function ProfileMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
      <circle cx="16" cy="12" r="5" fill="#d4a24a" />
      <path d="M6 27c1.6-5 5-7.5 10-7.5S24.4 22 26 27" fill="#d4a24a" />
    </svg>
  );
}

export function ProfileDock() {
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [invites, setInvites] = useState(0);
  const [label, setLabel] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const seeded = useRef("");

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let stop = false;
    const pull = () => {
      void loadCourt()
        .then((court) => {
          if (stop) return;
          setInvites(court.invites.length);
          const saved = court.profile.name && court.profile.name !== "لاعب" ? court.profile.name : "";
          const account = (user.displayName ?? "").trim();
          if (!saved && account.length >= 2 && account.length <= 18 && seeded.current !== account) {
            seeded.current = account;
            void saveCourtName({ data: account }).then((result) => {
              if (result.ok) {
                setLabel(result.name);
                courtBridge.onNamed(result.name);
              }
            });
          }
          setLabel(saved || account || "لاعب");
        })
        .catch(() => undefined);
    };
    pull();
    const timer = window.setInterval(pull, 8000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [ready, user]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (!ready || !user) return null;
  const photo = user.profileImageUrl;

  return (
    <div ref={box} className="fixed top-3 right-3 z-30">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border-2 border-gold bg-night/90 py-1 pr-1 pl-3 text-sand shadow-lg"
        aria-expanded={open}
        aria-label="السجل"
      >
        <span className="max-w-28 truncate text-sm font-extrabold">{label || "لاعب"}</span>
        <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-gold bg-lapis">
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <ProfileMark />}
          {invites > 0 ? (
            <span className="absolute -top-1 -left-1 grid h-4 min-w-4 place-items-center rounded-full bg-carnelian px-1 text-[10px] font-extrabold text-sand">
              {invites}
            </span>
          ) : null}
        </span>
      </button>
      {open ? (
        <div className="absolute top-14 right-0 max-h-[70vh] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto">
          <CourtPanel
            playName={courtBridge.playName}
            onPlay={(room, host, mode) => {
              setOpen(false);
              courtBridge.onPlay(room, host, mode);
            }}
            onNamed={(name) => {
              setLabel(name);
              courtBridge.onNamed(name);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function CourtPanel({
  playName,
  onPlay,
  onNamed,
}: {
  playName: string;
  onPlay: (room: string, host: boolean, mode?: "party") => void;
  onNamed: (name: string) => void;
}) {
  const [court, setCourt] = useState<CourtSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ id: string; name: string }[]>([]);
  const [note, setNote] = useState("");
  const triedName = useRef("");

  async function refresh() {
    try {
      const next = await loadCourt();
      setCourt(next);
      if (next.profile.name && next.profile.name !== "لاعب") onNamed(next.profile.name);
    } catch {
      setCourt(null);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
    // الاسم بيتسجل مرة من الخانة فوق، والبول بتاع الأونلاين كل ٨ ثواني.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!court) return;
    if (court.profile.name && court.profile.name !== "لاعب") return;
    const next = playName.trim();
    if (next.length < 2 || triedName.current === next) return;
    triedName.current = next;
    void rename(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court?.profile.name, playName]);

  async function rename(name: string) {
    const saved = await saveCourtName({ data: name });
    if (saved.ok) {
      onNamed(saved.name);
      setNote("الاسم اتسجل.");
      await refresh();
    }
  }

  return (
    <section className="mt-4 rounded-card border border-gold/50 bg-night/70 p-3 text-sand">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-gold">السجل</h2>
        <UserButton />
      </div>
      {court ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <img src="/art/cartouche.jpg" alt="" className="h-9 w-9 rounded-full border border-gold object-cover" />
            <p className="text-sm font-extrabold">خرطوش {court.profile.beads}</p>
          </div>
          <p className="mt-1 text-xs font-bold text-sand/80">
            لعب {court.profile.played} · كسب {court.profile.wins} · خسر {court.profile.losses}
          </p>
          {court.profile.name && court.profile.name !== "لاعب" ? null : (
            <p className="mt-1 text-xs text-sand/70">اكتب اسمك فوق، ويتسجل هنا.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm">لحظات…</p>
      )}
      {court?.invites.map((invite) => (
        <div key={invite.id} className="mt-2 flex items-center gap-2 text-sm">
          <p className="flex-1 font-bold">{invite.fromName} عايز يلعب</p>
          <button
            type="button"
            className="rounded-card bg-gold px-3 py-2 text-xs font-extrabold text-night"
            onClick={() => {
              if (playName.trim().length < 2) return;
              void answerCourtInvite({ data: { id: invite.id, accept: true } }).then((result) => {
                if (result.closed) {
                  setNote("اللعبة بدأت من غيره.");
                  return;
                }
                if (result.room) onPlay(result.room, false, result.party ? "party" : undefined);
              });
            }}
          >
            ادخل
          </button>
          <button
            type="button"
            className="text-xs font-bold text-sand/70"
            onClick={() => void answerCourtInvite({ data: { id: invite.id, accept: false } }).then(() => refresh())}
          >
            لأ
          </button>
        </div>
      ))}
      <ul className="mt-2 space-y-2">
        {court?.friends.map((friend) => (
          <li key={friend.id} className="flex items-center gap-2 text-sm">
            <span className={friend.online ? "text-gain" : "text-sand/50"}>{friend.online ? "●" : "○"}</span>
            <span className="flex-1 font-bold">{friend.name}</span>
            <button
              type="button"
              disabled={!friend.online}
              className="rounded-card border border-gold px-3 py-2 text-xs font-extrabold text-gold disabled:opacity-40"
              onClick={() => {
                if (playName.trim().length < 2) {
                  setNote("اكتب اسمك فوق الأول.");
                  return;
                }
                void inviteCourtFriend({ data: friend.id }).then((result) => {
                  if (result.busy) setNote(result.self ? "أنت في جيم دلوقتي" : "في جيم دلوقتي");
                  else if (result.full) setNote("الروم اتملت.");
                  else if (result.room) onPlay(result.room, true, "party");
                  else setNote("الدعوة ما اتبعتتش.");
                });
              }}
            >
              {friend.online ? "العب" : "مش متصل"}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={query}
          maxLength={18}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 flex-1 rounded-card border-2 border-gold bg-sand px-2 text-sm font-bold text-night"
          placeholder="اسم صاحبك"
        />
        <button
          type="button"
          className="rounded-card bg-gold px-3 text-sm font-extrabold text-night"
          onClick={() => {
            void findCourtPlayers({ data: query }).then(setFound);
          }}
        >
          دور
        </button>
      </div>
      {found.map((player) => (
        <button
          key={player.id}
          type="button"
          className="mt-2 block w-full text-right text-sm font-bold text-gold"
          onClick={() => {
            void addCourtFriend({ data: player.id }).then(async (result) => {
              setNote(result.ok ? "اتضاف في صحابك." : "مش لاقي الحساب.");
              setFound([]);
              await refresh();
            });
          }}
        >
          أضف {player.name}
        </button>
      ))}
      {court ? (
        <button type="button" className="mt-2 text-xs font-bold text-sand/70" onClick={() => void rename(query || court.profile.name)}>
          سجّل الاسم ده
        </button>
      ) : null}
      {note ? <p className="mt-2 text-xs font-bold text-gain">{note}</p> : null}
    </section>
  );
}
