/**
 * Salas e loop de partida (modo Anime). Transport-agnóstico: a camada WebSocket
 * apenas chama estes métodos. O servidor é autoritativo (roda o engine aqui).
 */

import { randomBytes } from "node:crypto";
import type { AnimeCommand, AnimeMatchView, PlayerIndex } from "@digimon/shared";
import { anime } from "@digimon/engine";
import { ctx, makeStarterDeck } from "./cards.js";
import { buildAnimeView } from "./view.js";

interface Seat {
  userId: string;
  ready: boolean;
}

export class RoomError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

export class GameRoom {
  readonly seats: [Seat | null, Seat | null] = [null, null];
  private state: anime.AnimeState | null = null;

  constructor(readonly code: string) {}

  join(userId: string): PlayerIndex {
    const idx = this.seats[0] === null ? 0 : this.seats[1] === null ? 1 : -1;
    if (idx === -1) throw new RoomError("room-full", "Sala cheia.");
    this.seats[idx] = { userId, ready: false };
    return idx as PlayerIndex;
  }

  setReady(seat: PlayerIndex): boolean {
    this.requireSeat(seat).ready = true;
    const [a, b] = this.seats;
    if (a?.ready && b?.ready && !this.state) {
      this.start(a, b);
      return true;
    }
    return false;
  }

  private start(a: Seat, b: Seat): void {
    const seed = randomBytes(4).readUInt32LE(0);
    this.state = anime.createAnimeMatch(ctx, {
      matchId: this.code,
      seed,
      firstPlayer: 0,
      players: [
        { id: a.userId, deck: makeStarterDeck() },
        { id: b.userId, deck: makeStarterDeck() },
      ],
    }).state;
  }

  command(seat: PlayerIndex, command: AnimeCommand): void {
    if (!this.state) throw new RoomError("not-started", "A partida não começou.");
    this.state = anime.reduce(ctx, this.state, command, seat).state;
  }

  viewFor(seat: PlayerIndex): AnimeMatchView | null {
    return this.state ? buildAnimeView(this.state, seat) : null;
  }

  get started(): boolean {
    return this.state !== null;
  }
  get playerIds(): string[] {
    return this.seats.filter((s): s is Seat => s !== null).map((s) => s.userId);
  }

  private requireSeat(seat: PlayerIndex): Seat {
    const s = this.seats[seat];
    if (!s) throw new RoomError("no-such-seat", "Assento inexistente.");
    return s;
  }
}

export class RoomManager {
  private readonly rooms = new Map<string, GameRoom>();

  create(userId: string): { room: GameRoom; seat: PlayerIndex } {
    let code = this.generateCode();
    while (this.rooms.has(code)) code = this.generateCode();
    const room = new GameRoom(code);
    this.rooms.set(code, room);
    return { room, seat: room.join(userId) };
  }

  join(code: string, userId: string): { room: GameRoom; seat: PlayerIndex } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new RoomError("no-such-room", "Sala não encontrada.");
    return { room, seat: room.join(userId) };
  }

  get(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  private generateCode(): string {
    return randomBytes(3).toString("hex").toUpperCase();
  }
}
