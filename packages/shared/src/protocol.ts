/**
 * Protocolo de rede entre cliente e servidor (WebSocket).
 *
 * Modelo: o servidor é autoritativo. O cliente envia COMANDOS (intenções);
 * o servidor valida no engine e responde com EVENTOS + uma VIEW filtrada do estado.
 * Veja docs/PROTOCOL.md.
 */

import type { CardNumber, Deck } from "./types.js";
import type { PlayerIndex, Phase } from "./phases.js";
import type { Zone } from "./zones.js";

/** Identificador opaco de uma instância de carta dentro de uma partida. */
export type CardInstanceId = string;

// ───────────────────────────── Comandos (Cliente → Servidor) ─────────────────────────────

export type GameCommand =
  | { type: "mulligan"; keep: boolean }
  | { type: "playCard"; cardId: CardInstanceId }
  | { type: "digivolve"; sourceId: CardInstanceId; targetId: CardInstanceId }
  | { type: "hatchEgg" } // mover Digi-Egg do eggDeck para a área de criação
  | { type: "moveFromBreeding" } // promover o Digimon da criação para a área de batalha
  | { type: "attack"; attackerId: CardInstanceId; target: AttackTarget }
  | { type: "activateEffect"; cardId: CardInstanceId; effectId?: string }
  | { type: "resolveChoice"; choiceId: string; selection: string[] }
  | { type: "passTurn" };

export type AttackTarget =
  | { kind: "security" }
  | { kind: "digimon"; cardId: CardInstanceId };

// ───────────────────────────── Envelopes Cliente → Servidor ─────────────────────────────

export type ClientMessage =
  | { type: "authenticate"; token: string }
  | { type: "createRoom" }
  | { type: "joinRoom"; code: string }
  | { type: "queueMatch" }
  | { type: "selectDeck"; deck: Deck }
  | { type: "ready" }
  | { type: "command"; command: GameCommand }
  | { type: "ping" };

// ───────────────────────────── Eventos de jogo (Servidor → Cliente) ─────────────────────────────

/** Eventos atômicos produzidos pelo engine ao aplicar um comando. */
export type GameEvent =
  | { type: "matchStarted"; players: [string, string]; firstPlayer: PlayerIndex }
  | { type: "phaseChanged"; player: PlayerIndex; phase: Phase; turn: number }
  | { type: "memoryChanged"; value: number }
  | { type: "cardMoved"; cardId: CardInstanceId; from: Zone; to: Zone; player: PlayerIndex }
  | { type: "cardDigivolved"; sourceId: CardInstanceId; targetId: CardInstanceId }
  | { type: "securityChecked"; player: PlayerIndex; revealed: CardNumber | null }
  | { type: "attackDeclared"; attackerId: CardInstanceId; target: AttackTarget }
  | { type: "cardDeleted"; cardId: CardInstanceId; player: PlayerIndex }
  | { type: "effectTriggered"; cardId: CardInstanceId; effectText: string }
  | { type: "gameOver"; winner: PlayerIndex; reason: string };

// ───────────────────────────── Envelopes Servidor → Cliente ─────────────────────────────

export type ServerMessage =
  | { type: "authenticated"; userId: string }
  | { type: "roomState"; code: string; players: string[] }
  | { type: "matchStart"; matchId: string; you: PlayerIndex }
  /** Snapshot do estado já filtrado para o jogador destinatário (sem info oculta do oponente). */
  | { type: "stateView"; view: unknown }
  | { type: "events"; events: GameEvent[] }
  /** Pede ao jogador uma escolha/reação (ex.: responder a um gatilho). */
  | { type: "promptChoice"; choiceId: string; prompt: string; options: ChoiceOption[]; min: number; max: number }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };

export interface ChoiceOption {
  id: string;
  label: string;
}
