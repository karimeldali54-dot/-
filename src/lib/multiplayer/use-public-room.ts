import { useCallback, useEffect, useRef, useState } from "react";

const BROKERS = ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt"];

export interface PublicPeer {
  id: string;
  name: string;
  connectionState: "connected" | "connecting" | "failed";
  candidateType: string | null;
  rttMs: number | null;
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function remaining(length: number) {
  const bytes: number[] = [];
  let n = length;
  do {
    let byte = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) byte |= 0x80;
    bytes.push(byte);
  } while (n > 0);
  return new Uint8Array(bytes);
}

function mqttString(value: string) {
  const bytes = new TextEncoder().encode(value);
  return concat([new Uint8Array([(bytes.length >> 8) & 0xff, bytes.length & 0xff]), bytes]);
}

function packet(header: number, body: Uint8Array) {
  return concat([new Uint8Array([header]), remaining(body.length), body]);
}

function connectPacket(clientId: string) {
  return packet(
    0x10,
    concat([mqttString("MQTT"), new Uint8Array([4, 0x02, 0x00, 30]), mqttString(clientId)]),
  );
}

function subscribePacket(topic: string) {
  return packet(0x82, concat([new Uint8Array([0x00, 0x01]), mqttString(topic), new Uint8Array([0])]));
}

function publishPacket(topic: string, payload: string) {
  return packet(0x30, concat([mqttString(topic), new TextEncoder().encode(payload)]));
}

function readPackets(state: { buf: Uint8Array }, chunk: Uint8Array) {
  state.buf = concat([state.buf, chunk]);
  const packets: { type: number; body: Uint8Array }[] = [];
  while (state.buf.length >= 2) {
    let value = 0;
    let multiplier = 1;
    let index = 1;
    let encoded = 0;
    for (;;) {
      if (index >= state.buf.length) return packets;
      encoded = state.buf[index++];
      value += (encoded & 127) * multiplier;
      multiplier *= 128;
      if (multiplier > 128 ** 4) return packets;
      if ((encoded & 128) === 0) break;
    }
    if (state.buf.length < index + value) return packets;
    packets.push({ type: state.buf[0] >> 4, body: state.buf.slice(index, index + value) });
    state.buf = state.buf.slice(index + value);
  }
  return packets;
}

function readPublish(body: Uint8Array) {
  if (body.length < 2) return null;
  const length = (body[0] << 8) | body[1];
  const start = 2 + length;
  if (body.length < start) return null;
  return new TextDecoder().decode(body.slice(start));
}

function openDirectRoom(options: {
  room: string;
  name: string;
  selfId: string;
  onStatus: (joined: boolean, trouble: boolean) => void;
  onPeers: (peers: PublicPeer[]) => void;
  onMessage: (from: string, data: unknown) => void;
}) {
  const topic = `arsh/alathar/${options.room}`;
  const seen = new Map<string, { name: string; at: number }>();
  let alive = true;
  let socket: WebSocket | null = null;
  let broker = 0;
  let ready = false;
  let failures = 0;
  let pingTimer = 0;
  let beatTimer = 0;
  let retryTimer = 0;
  const parser = { buf: new Uint8Array(0) };

  const showPeers = () => {
    const now = Date.now();
    const peers: PublicPeer[] = [];
    for (const [id, info] of seen) {
      if (now - info.at > 6500) seen.delete(id);
      else {
        peers.push({
          id,
          name: info.name,
          connectionState: "connected",
          candidateType: "ws",
          rttMs: null,
        });
      }
    }
    options.onPeers(peers);
  };

  const publish = (body: unknown, to?: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !ready) return;
    const envelope = {
      v: 1,
      from: options.selfId,
      name: options.name,
      ...(to ? { to } : {}),
      body,
    };
    socket.send(publishPacket(topic, JSON.stringify(envelope)));
  };

  const connect = () => {
    if (!alive) return;
    ready = false;
    parser.buf = new Uint8Array(0);
    const url = BROKERS[broker % BROKERS.length];
    const next = new WebSocket(url, ["mqtt"]);
    socket = next;
    next.binaryType = "arraybuffer";
    const clientId = `arsh${options.selfId.slice(1, 9)}${Math.random().toString(36).slice(2, 6)}`;
    const giveUp = window.setTimeout(() => {
      if (next.readyState !== WebSocket.OPEN) next.close();
    }, 7000);

    next.onopen = () => {
      window.clearTimeout(giveUp);
      next.send(connectPacket(clientId));
    };

    next.onmessage = (event) => {
      const chunk = new Uint8Array(event.data as ArrayBuffer);
      for (const item of readPackets(parser, chunk)) {
        if (item.type === 2) {
          if (item.body[1] !== 0) {
            next.close();
            return;
          }
          next.send(subscribePacket(topic));
          continue;
        }
        if (item.type === 9) {
          ready = true;
          failures = 0;
          options.onStatus(true, false);
          publish({ t: "here" });
          window.clearInterval(pingTimer);
          window.clearInterval(beatTimer);
          pingTimer = window.setInterval(() => {
            if (next.readyState === WebSocket.OPEN) next.send(new Uint8Array([0xc0, 0x00]));
          }, 20000);
          beatTimer = window.setInterval(() => {
            publish({ t: "here" });
            showPeers();
          }, 2000);
          continue;
        }
        if (item.type !== 3) continue;
        const raw = readPublish(item.body);
        if (!raw) continue;
        let envelope: { v?: number; from?: string; name?: string; to?: string; body?: unknown };
        try {
          envelope = JSON.parse(raw) as typeof envelope;
        } catch {
          continue;
        }
        if (envelope.v !== 1 || !envelope.from || envelope.from === options.selfId) continue;
        seen.set(envelope.from, { name: envelope.name?.trim() || "صاحبك", at: Date.now() });
        showPeers();
        if (envelope.to && envelope.to !== options.selfId) continue;
        if (!envelope.body || typeof envelope.body !== "object") continue;
        if ((envelope.body as { t?: string }).t === "here") continue;
        options.onMessage(envelope.from, envelope.body);
      }
    };

    next.onerror = () => undefined;
    next.onclose = () => {
      window.clearTimeout(giveUp);
      if (socket !== next || !alive) return;
      ready = false;
      window.clearInterval(pingTimer);
      window.clearInterval(beatTimer);
      failures += 1;
      options.onStatus(false, failures >= 2);
      broker += 1;
      retryTimer = window.setTimeout(connect, 700);
    };
  };

  connect();

  return {
    send(data: unknown, peerId?: string) {
      publish(data, peerId);
    },
    close() {
      alive = false;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      window.clearInterval(beatTimer);
      socket?.close();
    },
  };
}

export function usePublicRoom(options: { room: string; name: string }) {
  const [room] = useState(() => options.room);
  const [name] = useState(() => options.name);
  const [selfId] = useState(() => `p${Math.random().toString(36).slice(2, 10)}`);
  const [peers, setPeers] = useState<PublicPeer[]>([]);
  const [joined, setJoined] = useState(false);
  const [trouble, setTrouble] = useState(false);
  const linkRef = useRef<ReturnType<typeof openDirectRoom> | null>(null);
  const listeners = useRef(new Set<(from: string, data: unknown, channel: "reliable") => void>());

  useEffect(() => {
    const link = openDirectRoom({
      room,
      name,
      selfId,
      onStatus: (nextJoined, nextTrouble) => {
        setJoined(nextJoined);
        setTrouble(nextTrouble);
      },
      onPeers: setPeers,
      onMessage: (from, data) => {
        for (const fn of listeners.current) fn(from, data, "reliable");
      },
    });
    linkRef.current = link;
    return () => {
      linkRef.current = null;
      link.close();
    };
  }, [room, name, selfId]);

  const send = useCallback((data: unknown, peerId?: string) => linkRef.current?.send(data, peerId), []);
  const onMessage = useCallback((fn: (from: string, data: unknown, channel: "reliable") => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return { peers, joined, trouble, send, onMessage };
}
