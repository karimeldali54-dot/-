import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const ROOM = /^[a-z0-9]{6}$/;

export type CourtProfile = {
  name: string;
  beads: number;
  played: number;
  wins: number;
  losses: number;
};

export type CourtFriend = { id: string; name: string; online: boolean };
export type CourtInvite = { id: string; room: string; fromName: string; party: boolean };

export type PartySlot = { userId: string; name: string } | null;

export type PartySnapshot = {
  room: string;
  status: "lobby" | "live" | "done" | "missing";
  host: boolean;
  slots: PartySlot[];
};

export type InviteResult = { room: string; busy: boolean; self: boolean; full: boolean; party: boolean };

export type CourtSnapshot = {
  profile: CourtProfile;
  friends: CourtFriend[];
  invites: CourtInvite[];
};

function cleanName(value: string): string {
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 18) return "";
  return name;
}

function roomCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)] ?? "a";
  return code;
}

async function inLiveGame(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ ok: number }>`
    select 1 as ok
    from court_seat s
    join court_party p on p.room = s.room
    join court_profile me on me.user_id = s.user_id
    where s.user_id = ${userId}
      and p.status = 'live'
      and me.seen_at > now() - interval '45 seconds'
    limit 1
  `;
  return Boolean(rows[0]);
}

async function partyOf(room: string) {
  const sql = await getSql();
  const rows = await sql<{ room: string; host_id: string; status: string }>`
    select room, host_id, status from court_party where room = ${room}
  `;
  return rows[0] ?? null;
}

async function seatsIn(room: string) {
  const sql = await getSql();
  return sql<{ user_id: string; name: string; slot: number }>`
    select user_id, name, slot from court_seat where room = ${room} order by slot
  `;
}

function asSlots(rows: { user_id: string; name: string; slot: number }[]): PartySlot[] {
  const slots: PartySlot[] = [null, null, null, null];
  for (const row of rows) {
    const slot = Number(row.slot);
    if (slot >= 0 && slot < 4) slots[slot] = { userId: row.user_id, name: row.name };
  }
  return slots;
}

async function partySnapshot(room: string, userId: string): Promise<PartySnapshot> {
  const party = await partyOf(room);
  if (!party) return { room, status: "missing", host: false, slots: [null, null, null, null] };
  const status = party.status === "live" || party.status === "done" || party.status === "lobby" ? party.status : "missing";
  return { room, status, host: party.host_id === userId, slots: asSlots(await seatsIn(room)) };
}

async function profileName(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ name: string }>`select name from court_profile where user_id = ${userId}`;
  return cleanName(rows[0]?.name ?? "") || "لاعب";
}

async function seatPlayer(room: string, userId: string, name: string) {
  const sql = await getSql();
  const existing = await sql<{ slot: number }>`
    select slot from court_seat where room = ${room} and user_id = ${userId}
  `;
  if (existing[0]) {
    await sql`update court_seat set name = ${name} where room = ${room} and user_id = ${userId}`;
    return true;
  }
  const taken = await seatsIn(room);
  if (taken.length >= 4) return false;
  const used = new Set(taken.map((row) => Number(row.slot)));
  let slot = 0;
  while (used.has(slot)) slot += 1;
  await sql`
    insert into court_seat (room, user_id, slot, name)
    values (${room}, ${userId}, ${slot}, ${name})
  `;
  return true;
}

async function hostLobby(userId: string, name: string) {
  const sql = await getSql();
  const open = await sql<{ room: string }>`
    select room from court_party where host_id = ${userId} and status = 'lobby' order by created_at desc limit 1
  `;
  const room = open[0]?.room ?? roomCode();
  if (!open[0]) {
    await sql`
      insert into court_party (room, host_id, status)
      values (${room}, ${userId}, 'lobby')
    `;
  }
  await sql`
    delete from court_seat
    where user_id = ${userId}
      and room <> ${room}
      and room in (select room from court_party where status = 'lobby')
  `;
  await seatPlayer(room, userId, name);
  return room;
}

function inviteResult(patch: Partial<InviteResult> = {}): InviteResult {
  return { room: "", busy: false, self: false, full: false, party: true, ...patch };
}

async function ensureProfile(userId: string) {
  const sql = await getSql();
  await sql`insert into court_profile (user_id, name) values (${userId}, ${"لاعب"}) on conflict (user_id) do nothing`;
}

export const loadCourt = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CourtSnapshot> => {
    const sql = await getSql();
    const me = context.userId;
    const meBusy = await inLiveGame(me);
    await sql`update court_profile set seen_at = now() where user_id = ${me}`;
    const profiles = await sql<CourtProfile>`
      select name, beads, played, wins, losses from court_profile where user_id = ${me}
    `;
    const friends = await sql<{ id: string; name: string; online: boolean }>`
      select p.user_id as id, p.name, (p.seen_at > now() - interval '45 seconds') as online
      from court_friend f
      join court_profile p on p.user_id = f.friend_id
      where f.user_id = ${me}
      order by p.seen_at desc
    `;
    const invites = meBusy
      ? []
      : await sql<CourtInvite>`
      select i.id, i.room, p.name as "fromName",
        exists(select 1 from court_party cp where cp.room = i.room) as party
      from court_invite i
      join court_profile p on p.user_id = i.from_id
      where i.to_id = ${me}
        and i.status = 'open'
        and i.created_at > now() - interval '15 minutes'
      order by i.created_at desc
    `;
    return {
      profile: profiles[0] ?? { name: "", beads: 0, played: 0, wins: 0, losses: 0 },
      friends: friends.map((row) => ({ ...row, online: Boolean(row.online) })),
      invites: invites.map((row) => ({ ...row, party: Boolean(row.party) })),
    };
  });

export const saveCourtName = createServerFn({ method: "POST" })
  .validator((name: string) => cleanName(name))
  .middleware([authMiddleware])
  .handler(async ({ context, data: name }) => {
    if (!name) return { ok: false as const };
    const sql = await getSql();
    await sql`
      insert into court_profile (user_id, name, seen_at)
      values (${context.userId}, ${name}, now())
      on conflict (user_id) do update set name = excluded.name, seen_at = now()
    `;
    return { ok: true as const, name };
  });

export const findCourtPlayers = createServerFn({ method: "POST" })
  .validator((name: string) => cleanName(name))
  .middleware([authMiddleware])
  .handler(async ({ context, data: name }) => {
    if (!name) return [];
    const sql = await getSql();
    const like = `${name.replace(/[%_]/g, "")}%`;
    return sql<{ id: string; name: string }>`
      select user_id as id, name from court_profile
      where user_id <> ${context.userId} and name ilike ${like}
      order by name
      limit 6
    `;
  });

export const addCourtFriend = createServerFn({ method: "POST" })
  .validator((friendId: string) => (ID.test(friendId) ? friendId : ""))
  .middleware([authMiddleware])
  .handler(async ({ context, data: friendId }) => {
    if (!friendId || friendId === context.userId) return { ok: false as const };
    const sql = await getSql();
    const found = await sql<{ user_id: string }>`select user_id from court_profile where user_id = ${friendId}`;
    if (!found[0]) return { ok: false as const };
    await sql`
      insert into court_friend (user_id, friend_id)
      values (${context.userId}, ${friendId})
      on conflict (user_id, friend_id) do nothing
    `;
    return { ok: true as const };
  });

export const inviteCourtFriend = createServerFn({ method: "POST" })
  .validator((friendId: string) => (ID.test(friendId) ? friendId : ""))
  .middleware([authMiddleware])
  .handler(async ({ context, data: friendId }) => {
    if (!friendId) return inviteResult();
    if (await inLiveGame(context.userId)) return inviteResult({ busy: true, self: true });
    if (await inLiveGame(friendId)) return inviteResult({ busy: true });
    const sql = await getSql();
    const mine = await sql<{ friend_id: string }>`
      select friend_id from court_friend where user_id = ${context.userId} and friend_id = ${friendId}
    `;
    if (!mine[0]) return inviteResult();
    await ensureProfile(context.userId);
    const name = await profileName(context.userId);
    const room = await hostLobby(context.userId, name);
    const seated = await seatsIn(room);
    if (seated.length >= 4 && !seated.some((row) => row.user_id === friendId)) return inviteResult({ room, full: true });
    await sql`
      update court_invite set status = 'dropped'
      where from_id = ${context.userId} and to_id = ${friendId} and status = 'open'
    `;
    const id = `${context.userId.slice(0, 12)}-${room}-${friendId.slice(0, 8)}`;
    await sql`
      insert into court_invite (id, from_id, to_id, room, status)
      values (${id}, ${context.userId}, ${friendId}, ${room}, 'open')
      on conflict (id) do update set status = 'open', room = excluded.room, created_at = now()
    `;
    return inviteResult({ room });
  });

export const answerCourtInvite = createServerFn({ method: "POST" })
  .validator((input: { id?: string; accept?: boolean } | null | undefined) => ({
    id: input?.id && (ID.test(input.id) || /^[A-Za-z0-9_-]{1,96}$/.test(input.id)) ? input.id : "",
    accept: Boolean(input?.accept),
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.id) return { room: "", party: false, closed: false };
    if (data.accept && (await inLiveGame(context.userId))) return { room: "", party: true, closed: true };
    const sql = await getSql();
    const status = data.accept ? "accepted" : "declined";
    const rows = await sql<{ room: string }>`
      update court_invite
      set status = ${status}
      where id = ${data.id} and to_id = ${context.userId} and status = 'open'
      returning room
    `;
    const room = data.accept ? rows[0]?.room ?? "" : "";
    if (!room) return { room: "", party: false, closed: false };
    const party = await partyOf(room);
    if (!party) return { room, party: false, closed: false };
    if (party.status !== "lobby") return { room: "", party: true, closed: true };
    const name = await profileName(context.userId);
    const seated = await seatPlayer(room, context.userId, name);
    if (!seated) return { room: "", party: true, closed: true };
    return { room, party: true, closed: false };
  });

export const openParty = createServerFn({ method: "POST" })
  .validator((input: { name?: string } | null | undefined) => (typeof input?.name === "string" ? input.name : ""))
  .middleware([authMiddleware])
  .handler(async ({ context, data: preferred }) => {
    if (await inLiveGame(context.userId)) return inviteResult({ busy: true, self: true });
    await ensureProfile(context.userId);
    const typed = cleanName(preferred);
    const name = typed || (await profileName(context.userId));
    if (typed) {
      const sql = await getSql();
      await sql`update court_profile set name = ${typed} where user_id = ${context.userId}`;
    }
    const room = await hostLobby(context.userId, name);
    return inviteResult({ room });
  });

export const loadParty = createServerFn({ method: "POST" })
  .validator((room: string) => (ROOM.test(room) ? room : ""))
  .middleware([authMiddleware])
  .handler(async ({ context, data: room }): Promise<PartySnapshot> => {
    if (!room) return { room: "", status: "missing", host: false, slots: [null, null, null, null] };
    const sql = await getSql();
    await sql`update court_profile set seen_at = now() where user_id = ${context.userId}`;
    return partySnapshot(room, context.userId);
  });

export const joinParty = createServerFn({ method: "POST" })
  .validator((input: { room?: string; name?: string } | null | undefined) => ({
    room: input?.room && ROOM.test(input.room) ? input.room : "",
    name: typeof input?.name === "string" ? input.name : "",
  }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data.room) return { ok: false as const, full: false, closed: false };
    const party = await partyOf(data.room);
    if (!party || party.status === "done") return { ok: false as const, full: false, closed: true };
    const name = cleanName(data.name) || (await profileName(context.userId));
    if (party.status === "live") {
      const mine = (await seatsIn(data.room)).some((row) => row.user_id === context.userId);
      return { ok: mine, full: false, closed: !mine };
    }
    const seated = await seatPlayer(data.room, context.userId, name);
    return { ok: seated, full: !seated, closed: false };
  });

export const startParty = createServerFn({ method: "POST" })
  .validator((room: string) => (ROOM.test(room) ? room : ""))
  .middleware([authMiddleware])
  .handler(async ({ context, data: room }) => {
    if (!room) return { ok: false as const };
    const party = await partyOf(room);
    if (!party || party.host_id !== context.userId || party.status !== "lobby") return { ok: false as const };
    const count = (await seatsIn(room)).length;
    if (count < 2 || count > 4) return { ok: false as const };
    const sql = await getSql();
    await sql`update court_party set status = 'live' where room = ${room}`;
    return { ok: true as const };
  });

export const leaveParty = createServerFn({ method: "POST" })
  .validator((room: string) => (ROOM.test(room) ? room : ""))
  .middleware([authMiddleware])
  .handler(async ({ context, data: room }) => {
    if (!room) return { ok: false as const };
    const sql = await getSql();
    const party = await partyOf(room);
    await sql`delete from court_seat where room = ${room} and user_id = ${context.userId}`;
    const left = await seatsIn(room);
    if (party && (party.host_id === context.userId || left.length === 0)) {
      await sql`update court_party set status = 'done' where room = ${room}`;
    }
    return { ok: true as const };
  });

export const recordMatch = createServerFn({ method: "POST" })
  .validator((input: { dealId?: string; result?: "win" | "loss" | "tie" } | null | undefined) => {
    const dealId = input?.dealId?.trim() ?? "";
    const result = input?.result;
    if (!ROOM.test(dealId) && !/^[A-Za-z0-9_-]{1,64}$/.test(dealId)) return null;
    if (result !== "win" && result !== "loss" && result !== "tie") return null;
    return { dealId, result };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data) return { gained: 0, beads: 0 };
    const sql = await getSql();
    const me = context.userId;
    await ensureProfile(me);
    const inserted = await sql<{ deal_id: string }>`
      insert into court_result (user_id, deal_id, result)
      values (${me}, ${data.dealId}, ${data.result})
      on conflict (user_id, deal_id) do nothing
      returning deal_id
    `;
    const gained = data.result === "win" ? 12 : data.result === "tie" ? 6 : 3;
    if (inserted[0]) {
      const wins = data.result === "win" ? 1 : 0;
      const losses = data.result === "loss" ? 1 : 0;
      await sql`
        update court_profile
        set beads = beads + ${gained},
            played = played + 1,
            wins = wins + ${wins},
            losses = losses + ${losses},
            seen_at = now()
        where user_id = ${me}
      `;
    }
    const rows = await sql<{ beads: number }>`select beads from court_profile where user_id = ${me}`;
    return { gained: inserted[0] ? gained : 0, beads: rows[0]?.beads ?? 0 };
  });
