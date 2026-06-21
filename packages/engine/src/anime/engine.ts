/**
 * Motor do modo Anime: criação da partida e reducer puro.
 *   reduce(ctx, state, command, player) => { state, events }  (ou lança RuleError)
 */

import type { PlayerIndex } from "@digimon/shared";
import type { DigiDatabase } from "@digimon/cards";
import { RuleError } from "../errors.js";
import { createRng, shuffle } from "../rng.js";
import {
  ANIME_RULES,
  opponentOf,
  type AnimeAttackTarget,
  type AnimeCardInstance,
  type AnimeCommand,
  type AnimeEvent,
  type AnimePlayer,
  type AnimeStack,
  type AnimeState,
} from "./state.js";

export interface AnimeContext {
  db: DigiDatabase;
}

export interface AnimeReduceResult {
  state: AnimeState;
  events: AnimeEvent[];
}

export interface AnimeSeed {
  matchId: string;
  seed: number;
  firstPlayer: PlayerIndex;
  players: [{ id: string; deck: string[] }, { id: string; deck: string[] }];
}

/** DP efetivo: base do topo + 1 por carta de evolução embaixo. */
export function computeDp(ctx: AnimeContext, stack: AnimeStack): number {
  const top = stack.cards[0]!;
  return ctx.db.require(top.cardId).dp + (stack.cards.length - 1);
}

/** Triângulo de atributos: Vaccine ▸ Virus ▸ Data ▸ Vaccine. */
const BEATS: Record<string, string> = { Vaccine: "Virus", Virus: "Data", Data: "Vaccine" };
const ATTR_BONUS = 2;
function hasAttrAdvantage(ctx: AnimeContext, a: AnimeStack, b: AnimeStack): boolean {
  const aa = ctx.db.require(a.cards[0]!.cardId).attribute;
  const ba = ctx.db.require(b.cards[0]!.cardId).attribute;
  return !!aa && !!ba && BEATS[aa] === ba;
}

/** DP de batalha = DP efetivo + bônus de vantagem de atributo sobre o oponente. */
function battleDp(ctx: AnimeContext, self: AnimeStack, foe: AnimeStack): number {
  return computeDp(ctx, self) + (hasAttrAdvantage(ctx, self, foe) ? ATTR_BONUS : 0);
}

/** Garante ao menos 1 rookie na mão (abertura justa): troca por um rookie do deck. */
function ensureRookieInHand(ctx: AnimeContext, p: AnimePlayer): void {
  if (p.hand.some((c) => ctx.db.get(c.cardId)?.stage === "rookie")) return;
  const idx = p.deck.findIndex((c) => ctx.db.get(c.cardId)?.stage === "rookie");
  if (idx < 0) return;
  const [rookie] = p.deck.splice(idx, 1);
  const swapped = p.hand[0];
  if (rookie && swapped) {
    p.hand[0] = rookie;
    p.deck.push(swapped);
  }
}

export function createAnimeMatch(ctx: AnimeContext, seed: AnimeSeed): AnimeReduceResult {
  let counter = 0;
  const mkCards = (slugs: string[], owner: PlayerIndex): AnimeCardInstance[] =>
    slugs.map((cardId) => ({ id: `c${++counter}`, cardId, owner }));

  const player = (id: string, deck: string[], owner: PlayerIndex): AnimePlayer => ({
    id,
    deck: mkCards(deck, owner),
    hand: [],
    field: [],
    trash: [],
    hp: ANIME_RULES.TAMER_HP,
  });

  const state: AnimeState = {
    matchId: seed.matchId,
    players: [player(seed.players[0].id, seed.players[0].deck, 0), player(seed.players[1].id, seed.players[1].deck, 1)],
    activePlayer: seed.firstPlayer,
    firstPlayer: seed.firstPlayer,
    turn: 1,
    status: "playing",
    winner: null,
    rngState: seed.seed >>> 0,
    nextId: counter + 1,
  };

  const rng = createRng(state.rngState);
  for (const p of state.players) {
    p.deck = shuffle(p.deck, rng);
    p.hand = p.deck.splice(0, ANIME_RULES.STARTING_HAND);
    ensureRookieInHand(ctx, p);
  }
  state.rngState = rng.getState();

  return { state, events: [{ type: "matchStarted", firstPlayer: seed.firstPlayer }] };
}

// ───────────────────────────── reducer ─────────────────────────────

export function reduce(
  ctx: AnimeContext,
  state: AnimeState,
  command: AnimeCommand,
  player: PlayerIndex,
): AnimeReduceResult {
  if (state.status === "ended") throw new RuleError("game-over", "A partida já terminou.");
  const next = structuredClone(state);
  const events: AnimeEvent[] = [];

  if (player !== next.activePlayer) throw new RuleError("not-your-turn", "Não é o seu turno.");

  switch (command.type) {
    case "playDigimon":
      playDigimon(ctx, next, command.cardId, events);
      break;
    case "digivolve":
      digivolve(ctx, next, command.sourceId, command.targetId, events);
      break;
    case "attack":
      attack(ctx, next, command.attackerId, command.target, events);
      break;
    case "endTurn":
      endTurn(next, events);
      break;
    default: {
      const _exhaustive: never = command;
      throw new RuleError("unknown-command", `Comando desconhecido: ${JSON.stringify(_exhaustive)}`);
    }
  }

  return { state: next, events };
}

function playDigimon(ctx: AnimeContext, state: AnimeState, cardId: string, events: AnimeEvent[]): void {
  const p = state.players[state.activePlayer];
  const card = p.hand.find((c) => c.id === cardId);
  if (!card) throw new RuleError("card-not-in-hand", "Carta não está na mão.");
  const def = ctx.db.require(card.cardId);
  if (def.kind !== "digimon") throw new RuleError("not-a-digimon", "Esta carta não é um Digimon.");
  if (def.stage !== "rookie") throw new RuleError("not-rookie", "Só Digimon rookie entram direto em campo.");
  if (p.field.length >= ANIME_RULES.MAX_FIELD) throw new RuleError("field-full", "Campo cheio.");

  p.hand = p.hand.filter((c) => c.id !== cardId);
  p.field.push({ id: card.id, cards: [card], tired: false, playedThisTurn: true, digivolvedThisTurn: false });
  events.push({ type: "digimonPlayed", player: state.activePlayer, cardId: card.cardId });
}

function digivolve(
  ctx: AnimeContext,
  state: AnimeState,
  sourceId: string,
  targetId: string,
  events: AnimeEvent[],
): void {
  const p = state.players[state.activePlayer];
  const source = p.hand.find((c) => c.id === sourceId);
  if (!source) throw new RuleError("card-not-in-hand", "Evolução não está na mão.");
  const target = p.field.find((s) => s.id === targetId);
  if (!target) throw new RuleError("target-not-found", "Digimon a evoluir não encontrado.");

  if (target.digivolvedThisTurn) {
    throw new RuleError("already-digivolved", "Este Digimon já evoluiu neste turno (1 por turno).");
  }
  const baseDef = ctx.db.require(target.cards[0]!.cardId);
  const evoDef = ctx.db.require(source.cardId);
  if (!ctx.db.canDigivolve(baseDef, evoDef)) {
    throw new RuleError("illegal-digivolution", `${evoDef.name} não evolui de ${baseDef.name}.`);
  }

  p.hand = p.hand.filter((c) => c.id !== sourceId);
  target.cards.unshift(source);
  target.playedThisTurn = false; // evoluir tira o enjoo
  target.digivolvedThisTurn = true; // 1 digivolução por turno
  events.push({ type: "digivolved", player: state.activePlayer, from: baseDef.id, to: evoDef.id });
}

function attack(
  ctx: AnimeContext,
  state: AnimeState,
  attackerId: string,
  target: AnimeAttackTarget,
  events: AnimeEvent[],
): void {
  const me = state.players[state.activePlayer];
  const oppIdx = opponentOf(state.activePlayer);
  const opp = state.players[oppIdx];

  const attacker = me.field.find((s) => s.id === attackerId);
  if (!attacker) throw new RuleError("attacker-not-found", "Atacante não encontrado.");
  if (attacker.playedThisTurn) throw new RuleError("summoning-sickness", "Digimon recém-jogado não ataca neste turno.");
  if (attacker.tired) throw new RuleError("attacker-tired", "Este Digimon já atacou neste turno.");

  events.push({ type: "attacked", attacker: attackerId, target });
  attacker.tired = true;

  if (target.kind === "tamer") {
    if (opp.field.length > 0) {
      throw new RuleError("tamer-shielded", "O Tamer está protegido por Digimon. Derrote-os primeiro.");
    }
    opp.hp -= 1;
    events.push({ type: "tamerDamaged", player: oppIdx, hp: opp.hp });
    if (opp.hp <= 0) endGame(state, state.activePlayer, "tamer-defeated", events);
    return;
  }

  const defender = opp.field.find((s) => s.id === target.stackId);
  if (!defender) throw new RuleError("defender-not-found", "Alvo não encontrado.");
  const aDp = battleDp(ctx, attacker, defender);
  const dDp = battleDp(ctx, defender, attacker);
  if (aDp >= dDp) deleteStack(state, oppIdx, defender, events);
  if (dDp >= aDp) deleteStack(state, state.activePlayer, attacker, events);
}

function endTurn(state: AnimeState, events: AnimeEvent[]): void {
  const opp = opponentOf(state.activePlayer);
  state.activePlayer = opp;
  state.turn += 1;
  const p = state.players[opp];
  for (const s of p.field) {
    s.tired = false;
    s.playedThisTurn = false;
    s.digivolvedThisTurn = false;
  }
  events.push({ type: "turnChanged", player: opp, turn: state.turn });

  // Compra do início do turno (deck vazio = derrota).
  const card = p.deck.shift();
  if (!card) {
    endGame(state, opponentOf(opp), "deck-out", events);
    return;
  }
  p.hand.push(card);
  events.push({ type: "cardDrawn", player: opp });
}

function deleteStack(state: AnimeState, owner: PlayerIndex, stack: AnimeStack, events: AnimeEvent[]): void {
  const p = state.players[owner];
  p.field = p.field.filter((s) => s.id !== stack.id);
  for (const c of stack.cards) p.trash.push(c);
  events.push({ type: "digimonDeleted", player: owner, stackId: stack.id });
}

function endGame(state: AnimeState, winner: PlayerIndex, reason: string, events: AnimeEvent[]): void {
  if (state.status === "ended") return;
  state.status = "ended";
  state.winner = winner;
  events.push({ type: "gameOver", winner, reason });
}
