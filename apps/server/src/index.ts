/**
 * Servidor de jogo: HTTP (health + auth) + WebSocket autoritativo (salas + partida).
 *
 * - HTTP: POST /auth/register, POST /auth/login, GET /health
 * - WS: protocolo de @digimon/shared (authenticate, createRoom, joinRoom, selectDeck,
 *   ready, command, ping). O servidor roda o engine e envia views filtradas.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type {
  ClientMessage,
  Deck,
  GameEvent,
  PlayerIndex,
  ServerMessage,
} from "@digimon/shared";
import { config } from "./config.js";
import { AuthError, AuthService, type User } from "./auth.js";
import { RoomError, RoomManager } from "./room.js";
import type { GameRoom } from "./room.js";
import type { DeckLists } from "./cards.js";

interface Session {
  user: User | null;
  room: GameRoom | null;
  seat: PlayerIndex | null;
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function expandDeck(deck: Deck): DeckLists {
  const main = deck.main.flatMap((e) => Array.from({ length: e.count }, () => e.number));
  const eggDeck = deck.eggs.flatMap((e) => Array.from({ length: e.count }, () => e.number));
  return { deck: main, eggDeck };
}

export interface RunningServer {
  port: number;
  close(): Promise<void>;
}

export function startServer(port = config.port): Promise<RunningServer> {
  const auth = new AuthService();
  const rooms = new RoomManager();
  /** code → (seat → socket) para broadcast. */
  const connections = new Map<string, Map<PlayerIndex, WebSocket>>();
  const sessions = new Map<WebSocket, Session>();

  const http = createServer((req, res) => handleHttp(auth, req, res));
  const wss = new WebSocketServer({ server: http });

  function register(room: GameRoom, seat: PlayerIndex, ws: WebSocket): void {
    let map = connections.get(room.code);
    if (!map) {
      map = new Map();
      connections.set(room.code, map);
    }
    map.set(seat, ws);
  }

  function broadcastRoomState(room: GameRoom): void {
    const map = connections.get(room.code);
    if (!map) return;
    for (const ws of map.values()) {
      send(ws, { type: "roomState", code: room.code, players: room.playerIds });
    }
  }

  function broadcast(room: GameRoom, events: GameEvent[]): void {
    const map = connections.get(room.code);
    if (!map) return;
    for (const [seat, ws] of map) {
      if (events.length) send(ws, { type: "events", events });
      const view = room.viewFor(seat);
      if (view) send(ws, { type: "stateView", view });
    }
  }

  wss.on("connection", (ws) => {
    sessions.set(ws, { user: null, room: null, seat: null });

    ws.on("message", (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        send(ws, { type: "error", code: "bad-json", message: "Mensagem inválida." });
        return;
      }
      try {
        handleMessage(ws, msg);
      } catch (err) {
        const code = err instanceof RoomError ? err.code : "internal";
        const message = err instanceof Error ? err.message : "Erro interno.";
        send(ws, { type: "error", code, message });
      }
    });

    ws.on("close", () => sessions.delete(ws));
  });

  function handleMessage(ws: WebSocket, msg: ClientMessage): void {
    const session = sessions.get(ws)!;

    if (msg.type === "ping") return send(ws, { type: "pong" });

    if (msg.type === "authenticate") {
      const user = auth.authenticate(msg.token);
      if (!user) return send(ws, { type: "error", code: "unauthorized", message: "Token inválido." });
      session.user = user;
      return send(ws, { type: "authenticated", userId: user.id });
    }

    if (!session.user) {
      return send(ws, { type: "error", code: "unauthorized", message: "Autentique-se primeiro." });
    }

    switch (msg.type) {
      case "createRoom": {
        const { room, seat } = rooms.create(session.user.id);
        session.room = room;
        session.seat = seat;
        register(room, seat, ws);
        return send(ws, { type: "roomState", code: room.code, players: room.playerIds });
      }
      case "joinRoom": {
        const { room, seat } = rooms.join(msg.code, session.user.id);
        session.room = room;
        session.seat = seat;
        register(room, seat, ws);
        return broadcastRoomState(room);
      }
      case "selectDeck": {
        requireRoom(session).selectDeck(session.seat!, expandDeck(msg.deck));
        return;
      }
      case "ready": {
        const room = requireRoom(session);
        const started = room.setReady(session.seat!);
        if (started) {
          const map = connections.get(room.code);
          for (const [seat, sock] of map ?? []) {
            send(sock, { type: "matchStart", matchId: room.code, you: seat });
            const view = room.viewFor(seat);
            if (view) send(sock, { type: "stateView", view });
          }
        }
        return;
      }
      case "command": {
        const room = requireRoom(session);
        const events = room.command(session.seat!, msg.command);
        return broadcast(room, events);
      }
      default:
        return send(ws, { type: "error", code: "unknown", message: "Mensagem não suportada." });
    }
  }

  return new Promise((resolve) => {
    http.listen(port, () => {
      const addr = http.address();
      const actual = typeof addr === "object" && addr ? addr.port : port;
      // eslint-disable-next-line no-console
      console.log(`[server] ouvindo em http://localhost:${actual} (ws + /health + /auth)`);
      resolve({
        port: actual,
        close: () =>
          new Promise<void>((done) => {
            wss.close();
            http.close(() => done());
          }),
      });
    });
  });
}

function requireRoom(session: Session): GameRoom {
  if (!session.room || session.seat === null) {
    throw new RoomError("no-room", "Entre em uma sala primeiro.");
  }
  return session.room;
}

// ───────────────────────────── HTTP (health + auth) ─────────────────────────────

function handleHttp(auth: AuthService, req: IncomingMessage, res: ServerResponse): void {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { status: "ok", uptime: process.uptime() });
  }
  if (req.method === "POST" && (req.url === "/auth/register" || req.url === "/auth/login")) {
    return readJson(req, (body) => {
      try {
        const { email, password } = (body ?? {}) as { email?: string; password?: string };
        const result =
          req.url === "/auth/register"
            ? auth.register(email ?? "", password ?? "")
            : auth.login(email ?? "", password ?? "");
        json(res, 200, result);
      } catch (err) {
        if (err instanceof AuthError) json(res, 400, { code: err.code, message: err.message });
        else json(res, 500, { code: "internal", message: "Erro interno." });
      }
    });
  }
  res.writeHead(404);
  res.end();
}

function readJson(req: IncomingMessage, cb: (body: unknown) => void): void {
  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    try {
      cb(data ? JSON.parse(data) : {});
    } catch {
      cb({});
    }
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

// Inicialização direta (não em testes).
if (process.env.NODE_ENV !== "test") {
  void startServer();
}
