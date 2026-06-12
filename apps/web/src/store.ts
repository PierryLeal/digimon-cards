import { create } from "zustand";
import type { CardDefinition, GameCommand, GameEvent, MatchView, ServerMessage } from "@digimon/shared";
import { fetchCards, login, register } from "./net/api.js";
import { GameSocket } from "./net/socket.js";

export type Screen = "auth" | "lobby" | "match";

interface GameStore {
  screen: Screen;
  userId?: string;
  cards: Record<string, CardDefinition>;
  roomCode?: string;
  roomPlayers: string[];
  view?: MatchView;
  log: GameEvent[];
  error?: string;
  busy: boolean;

  authenticate(mode: "login" | "register", email: string, password: string): Promise<void>;
  createRoom(): void;
  joinRoom(code: string): void;
  ready(): void;
  sendCommand(command: GameCommand): void;
  clearError(): void;
}

let socket: GameSocket | null = null;

export const useStore = create<GameStore>((set, get) => {
  function handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "authenticated":
        set({ userId: msg.userId, screen: "lobby", busy: false });
        break;
      case "roomState":
        set({ roomCode: msg.code, roomPlayers: msg.players });
        break;
      case "matchStart":
        set({ screen: "match", log: [] });
        break;
      case "stateView":
        set({ view: msg.view as MatchView });
        break;
      case "events":
        set((s) => ({ log: [...s.log, ...msg.events].slice(-60) }));
        break;
      case "error":
        set({ error: `${msg.code}: ${msg.message}`, busy: false });
        break;
      default:
        break;
    }
  }

  return {
    screen: "auth",
    cards: {},
    roomPlayers: [],
    log: [],
    busy: false,

    async authenticate(mode, email, password) {
      set({ busy: true, error: undefined });
      try {
        const result = await (mode === "register" ? register : login)(email, password);
        const cards = await fetchCards();
        const index: Record<string, CardDefinition> = {};
        for (const c of cards) index[c.number] = c;
        set({ cards: index });
        socket = new GameSocket(handleMessage, () => socket?.authenticate(result.token));
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Falha.", busy: false });
      }
    },

    createRoom() {
      socket?.createRoom();
    },
    joinRoom(code) {
      socket?.joinRoom(code.trim().toUpperCase());
    },
    ready() {
      socket?.ready();
    },
    sendCommand(command) {
      get().clearError();
      socket?.command(command);
    },
    clearError() {
      set({ error: undefined });
    },
  };
});
