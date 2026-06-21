/**
 * Estado do modo Anime (homebrew). Ruleset simples: Tamer com HP, Digimon protegem o
 * Tamer, digivolução tendo a evolução na mão. Veja docs/RULES_ANIME.md.
 */

import type { AnimeAttackTarget, AnimeCommand, PlayerIndex } from "@digimon/shared";

export type { AnimeAttackTarget, AnimeCommand };

export interface AnimeCardInstance {
  id: string;
  /** Slug da carta na digidex. */
  cardId: string;
  owner: PlayerIndex;
}

/** Um Digimon em campo: pilha de evolução (topo = forma atual). */
export interface AnimeStack {
  id: string;
  cards: AnimeCardInstance[];
  /** Já agiu/atacou neste turno (não pode atacar de novo). */
  tired: boolean;
  /** Entrou em campo neste turno (enjoo: não ataca no turno em que foi jogado). */
  playedThisTurn: boolean;
  /** Já evoluiu neste turno (1 digivolução por Digimon por turno). */
  digivolvedThisTurn: boolean;
  /** Dano acumulado (deletado quando atinge o HP da carta). */
  damage: number;
}

export interface AnimePlayer {
  id: string;
  deck: AnimeCardInstance[];
  hand: AnimeCardInstance[];
  field: AnimeStack[];
  trash: AnimeCardInstance[];
  hp: number;
  /** DigiSoul disponível neste turno. */
  digiSoul: number;
  /** Teto de DigiSoul (cresce 1 por turno). */
  digiSoulMax: number;
}

export interface AnimeState {
  matchId: string;
  players: [AnimePlayer, AnimePlayer];
  activePlayer: PlayerIndex;
  firstPlayer: PlayerIndex;
  turn: number;
  status: "playing" | "ended";
  winner: PlayerIndex | null;
  rngState: number;
  nextId: number;
}

export type AnimeEvent =
  | { type: "matchStarted"; firstPlayer: PlayerIndex }
  | { type: "turnChanged"; player: PlayerIndex; turn: number }
  | { type: "cardDrawn"; player: PlayerIndex }
  | { type: "digimonPlayed"; player: PlayerIndex; cardId: string }
  | { type: "digivolved"; player: PlayerIndex; from: string; to: string }
  | { type: "attacked"; attacker: string; target: AnimeAttackTarget }
  | { type: "digimonDeleted"; player: PlayerIndex; stackId: string }
  | { type: "tamerDamaged"; player: PlayerIndex; hp: number }
  | { type: "gameOver"; winner: PlayerIndex; reason: string };

export const ANIME_RULES = {
  STARTING_HAND: 5,
  TAMER_HP: 5,
  MAX_FIELD: 5,
  /** Teto do DigiSoul (cresce 1 por turno até aqui). */
  DIGISOUL_MAX: 8,
} as const;

export function opponentOf(p: PlayerIndex): PlayerIndex {
  return p === 0 ? 1 : 0;
}
