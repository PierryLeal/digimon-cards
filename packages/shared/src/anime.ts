/**
 * Protocolo do modo Anime: comandos do cliente e a visão filtrada da partida.
 * Tipos de fio compartilhados entre engine, servidor e web. Veja docs/RULES_ANIME.md.
 */

import type { PlayerIndex } from "./phases.js";

// ── Comandos (cliente → servidor) ──
export type AnimeAttackTarget = { kind: "tamer" } | { kind: "digimon"; stackId: string };

export type AnimeCommand =
  | { type: "playDigimon"; cardId: string }
  | { type: "digivolve"; sourceId: string; targetId: string }
  | { type: "attack"; attackerId: string; target: AnimeAttackTarget; attackIndex?: number }
  | { type: "endTurn" };

// ── Visão filtrada (servidor → cliente) ──
export interface AnimeCardView {
  id: string;
  /** Slug da carta (para buscar nome/arte/DP na digidex). */
  cardId: string;
}

export interface AnimeStackView {
  id: string;
  cards: AnimeCardView[];
  tired: boolean;
  playedThisTurn: boolean;
  /** Dano acumulado (HP da carta vem da digidex). */
  damage: number;
}

export interface AnimePlayerView {
  id: string;
  hp: number;
  digiSoul: number;
  digiSoulMax: number;
  /** Mão completa apenas para o próprio jogador. */
  hand?: AnimeCardView[];
  handCount: number;
  deckCount: number;
  trashCount: number;
  field: AnimeStackView[];
}

export interface AnimeMatchView {
  matchId: string;
  you: PlayerIndex;
  activePlayer: PlayerIndex;
  turn: number;
  status: "playing" | "ended";
  winner: PlayerIndex | null;
  players: [AnimePlayerView, AnimePlayerView];
}
