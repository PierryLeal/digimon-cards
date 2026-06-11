/**
 * Fluxo da partida: compra, deleção, memória e a passagem de turno
 * (Unsuspend → Draw → Breeding → Main → End).
 *
 * Estas funções MUTAM o estado recebido — o reducer sempre opera sobre um clone.
 */

import type { GameEvent, PlayerIndex } from "@digimon/shared";
import type { CardInstance, CardStack, GameState, PlayerState } from "./state.js";
import { opponentOf } from "./state.js";
import { triggerStack } from "./effects/triggers.js";

export function endGame(state: GameState, winner: PlayerIndex, reason: string, events: GameEvent[]): void {
  if (state.status === "ended") return;
  state.status = "ended";
  state.winner = winner;
  events.push({ type: "gameOver", winner, reason });
}

/** Compra `n` cartas para o jogador. Comprar de deck vazio = derrota (deck-out). */
export function draw(state: GameState, player: PlayerIndex, n: number, events: GameEvent[]): void {
  const p = state.players[player];
  for (let i = 0; i < n; i++) {
    const card = p.deck.shift();
    if (!card) {
      endGame(state, opponentOf(player), "deck-out", events);
      return;
    }
    p.hand.push(card);
    events.push({ type: "cardMoved", cardId: card.id, from: "deck", to: "hand", player });
  }
}

/** Move um stack inteiro (carta + fontes de evolução) para o lixo do dono. */
export function deleteStack(state: GameState, stack: CardStack, events: GameEvent[]): void {
  const owner = stack.cards[0]!.owner;
  triggerStack(state, stack, "onDeletion", events); // [On Deletion] do topo + fontes
  const p = state.players[owner];
  const idx = p.battle.findIndex((s) => s.id === stack.id);
  if (idx >= 0) p.battle.splice(idx, 1);
  for (const card of stack.cards) p.trash.push(card);
  events.push({ type: "cardDeleted", cardId: stack.id, player: owner });
}

/** Ajusta a memória (do ponto de vista do ativo) e emite o evento. */
export function setMemory(state: GameState, value: number, events: GameEvent[]): void {
  state.memory = Math.max(-10, Math.min(10, value));
  events.push({ type: "memoryChanged", value: state.memory });
}

/**
 * Após uma ação que gastou memória: se a memória cruzou para o lado do oponente
 * (negativa), o turno termina automaticamente.
 */
export function checkAutoEndTurn(state: GameState, events: GameEvent[]): void {
  if (state.pendingChoice) return; // aguardando uma escolha: não encerra o turno
  if (state.status === "playing" && state.memory < 0) {
    endTurn(state, events);
  }
}

/** Inicia o turno do jogador ativo: Unsuspend → Draw → Breeding → Main. */
export function beginTurn(state: GameState, events: GameEvent[]): void {
  const active = state.activePlayer;
  const p = state.players[active];

  // Unsuspend
  state.phase = "unsuspend";
  for (const stack of p.battle) {
    stack.suspended = false;
    stack.playedThisTurn = false;
  }
  if (p.breeding) p.breeding.playedThisTurn = false;
  p.movedFromBreedingThisTurn = false;
  events.push({ type: "phaseChanged", player: active, phase: "unsuspend", turn: state.turn });

  // Draw (o jogador do 1º turno do jogo não compra)
  state.phase = "draw";
  events.push({ type: "phaseChanged", player: active, phase: "draw", turn: state.turn });
  const isVeryFirstTurn = state.turn === 1 && active === state.firstPlayer;
  if (!isVeryFirstTurn) {
    draw(state, active, 1, events);
    if (state.status === "ended") return;
  }

  // Breeding (interativo) e Main são tratados como a fase jogável "main".
  events.push({ type: "phaseChanged", player: active, phase: "breeding", turn: state.turn });
  state.phase = "main";
  events.push({ type: "phaseChanged", player: active, phase: "main", turn: state.turn });
}

/**
 * Encerra o turno do jogador ativo e passa para o oponente.
 * Memória do oponente = max(0, -memória) (passar com memória positiva a descarta).
 */
export function endTurn(state: GameState, events: GameEvent[]): void {
  const active = state.activePlayer;
  state.phase = "end";
  events.push({ type: "phaseChanged", player: active, phase: "end", turn: state.turn });

  // Efeitos agendados de fim de turno (ex.: MetalGreymon perde 3 de memória).
  for (const d of state.delayedEndOfTurn) {
    if (d.kind === "memory") {
      const sign = d.owner === active ? 1 : -1;
      setMemory(state, state.memory + sign * d.delta, events);
    }
  }
  state.delayedEndOfTurn = [];
  for (const stack of state.players[active].battle) {
    triggerStack(state, stack, "endOfTurn", events);
  }

  const opp = opponentOf(active);
  const nextMemory = Math.max(0, -state.memory);
  state.activePlayer = opp;
  state.turn += 1;
  setMemory(state, nextMemory, events);
  beginTurn(state, events);
}

// ───────────────────────── helpers de busca ─────────────────────────

export function findStack(p: PlayerState, id: string): CardStack | undefined {
  return p.battle.find((s) => s.id === id);
}

export function makeStack(top: CardInstance, sources: CardInstance[] = []): CardStack {
  return { id: top.id, cards: [top, ...sources], suspended: false, playedThisTurn: false };
}
