/**
 * Motor do modo Anime: criação da partida e reducer puro.
 *   reduce(ctx, state, command, player) => { state, events }  (ou lança RuleError)
 *
 * Mecânicas: DigiSoul (energia/turno) + custo, HP por Digimon (dano acumula),
 * ataques com efeito e habilidades por gatilho. Veja docs/RULES_ANIME.md.
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

// ───────────────────────────── helpers de combate ─────────────────────────────

const BEATS: Record<string, string> = { Vaccine: "Virus", Virus: "Data", Data: "Vaccine" };
const ATTR_BONUS = 2;

function hasAttrAdvantage(ctx: AnimeContext, a: AnimeStack, b: AnimeStack): boolean {
  const aa = ctx.db.require(a.cards[0]!.cardId).attribute;
  const ba = ctx.db.require(b.cards[0]!.cardId).attribute;
  return !!aa && !!ba && BEATS[aa] === ba;
}

function maxHp(ctx: AnimeContext, stack: AnimeStack): number {
  return ctx.db.require(stack.cards[0]!.cardId).hp || 1;
}

/** Poder e efeito de um ataque: base + bônus de evolução (1 por carta embaixo). */
function attackInfo(ctx: AnimeContext, stack: AnimeStack, idx: number): { power: number; effect?: string } {
  const def = ctx.db.require(stack.cards[0]!.cardId);
  const atk = def.attacks[idx] ?? def.attacks[0];
  return { power: (atk?.power ?? def.dp) + (stack.cards.length - 1), effect: atk?.effect };
}

// ───────────────────────────── efeitos / habilidades ─────────────────────────────

function drawCard(state: AnimeState, player: PlayerIndex, events: AnimeEvent[]): void {
  const p = state.players[player];
  const card = p.deck.shift();
  if (!card) {
    endGame(state, opponentOf(player), "deck-out", events);
    return;
  }
  p.hand.push(card);
  events.push({ type: "cardDrawn", player });
}

function applyEffect(state: AnimeState, effect: string, controller: PlayerIndex, events: AnimeEvent[]): void {
  const p = state.players[controller];
  switch (effect) {
    case "draw1":
      drawCard(state, controller, events);
      break;
    case "heal1":
      p.hp = Math.min(ANIME_RULES.TAMER_HP, p.hp + 1);
      break;
    case "heal2":
      p.hp = Math.min(ANIME_RULES.TAMER_HP, p.hp + 2);
      break;
    default:
      break; // "pierce" é tratado na resolução do ataque
  }
}

function triggerAbility(
  ctx: AnimeContext,
  state: AnimeState,
  stack: AnimeStack,
  trigger: "onPlay" | "onDigivolve" | "onAttack" | "onDestroyed",
  events: AnimeEvent[],
): void {
  const ability = ctx.db.require(stack.cards[0]!.cardId).ability;
  if (ability?.trigger === trigger) applyEffect(state, ability.effect, stack.cards[0]!.owner, events);
}

function damageTamer(
  state: AnimeState,
  victim: PlayerIndex,
  amount: number,
  attacker: PlayerIndex,
  events: AnimeEvent[],
): void {
  const p = state.players[victim];
  p.hp -= amount;
  events.push({ type: "tamerDamaged", player: victim, hp: p.hp });
  if (p.hp <= 0) endGame(state, attacker, "tamer-defeated", events);
}

// ───────────────────────────── setup ─────────────────────────────

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
    digiSoul: 0,
    digiSoulMax: 0,
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

  // O primeiro jogador começa com 1 de DigiSoul.
  const first = state.players[seed.firstPlayer];
  first.digiSoulMax = 1;
  first.digiSoul = 1;

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
      attack(ctx, next, command.attackerId, command.target, command.attackIndex ?? 0, events);
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

function spendDigiSoul(p: AnimePlayer, cost: number): void {
  if (p.digiSoul < cost) {
    throw new RuleError("no-digisoul", `DigiSoul insuficiente (precisa de ${cost}).`);
  }
  p.digiSoul -= cost;
}

function playDigimon(ctx: AnimeContext, state: AnimeState, cardId: string, events: AnimeEvent[]): void {
  const p = state.players[state.activePlayer];
  const card = p.hand.find((c) => c.id === cardId);
  if (!card) throw new RuleError("card-not-in-hand", "Carta não está na mão.");
  const def = ctx.db.require(card.cardId);
  if (def.kind !== "digimon") throw new RuleError("not-a-digimon", "Esta carta não é um Digimon.");
  if (def.stage !== "rookie") throw new RuleError("not-rookie", "Só Digimon rookie entram direto em campo.");
  if (p.field.length >= ANIME_RULES.MAX_FIELD) throw new RuleError("field-full", "Campo cheio.");
  spendDigiSoul(p, def.cost);

  p.hand = p.hand.filter((c) => c.id !== cardId);
  const stack: AnimeStack = {
    id: card.id,
    cards: [card],
    tired: false,
    playedThisTurn: true,
    digivolvedThisTurn: false,
    damage: 0,
  };
  p.field.push(stack);
  events.push({ type: "digimonPlayed", player: state.activePlayer, cardId: card.cardId });
  triggerAbility(ctx, state, stack, "onPlay", events);
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
  spendDigiSoul(p, evoDef.cost);

  p.hand = p.hand.filter((c) => c.id !== sourceId);
  target.cards.unshift(source);
  target.playedThisTurn = false;
  target.digivolvedThisTurn = true;
  events.push({ type: "digivolved", player: state.activePlayer, from: baseDef.id, to: evoDef.id });
  triggerAbility(ctx, state, target, "onDigivolve", events);
}

function attack(
  ctx: AnimeContext,
  state: AnimeState,
  attackerId: string,
  target: AnimeAttackTarget,
  attackIndex: number,
  events: AnimeEvent[],
): void {
  const active = state.activePlayer;
  const oppIdx = opponentOf(active);
  const me = state.players[active];
  const opp = state.players[oppIdx];

  const attacker = me.field.find((s) => s.id === attackerId);
  if (!attacker) throw new RuleError("attacker-not-found", "Atacante não encontrado.");
  if (attacker.playedThisTurn) throw new RuleError("summoning-sickness", "Digimon recém-jogado não ataca neste turno.");
  if (attacker.tired) throw new RuleError("attacker-tired", "Este Digimon já atacou neste turno.");

  events.push({ type: "attacked", attacker: attackerId, target });
  attacker.tired = true;
  triggerAbility(ctx, state, attacker, "onAttack", events);

  if (target.kind === "tamer") {
    if (opp.field.length > 0) {
      throw new RuleError("tamer-shielded", "O Tamer está protegido por Digimon. Derrote-os primeiro.");
    }
    damageTamer(state, oppIdx, 1, active, events);
    return;
  }

  const defender = opp.field.find((s) => s.id === target.stackId);
  if (!defender) throw new RuleError("defender-not-found", "Alvo não encontrado.");

  const atk = attackInfo(ctx, attacker, attackIndex);
  const aPow = atk.power + (hasAttrAdvantage(ctx, attacker, defender) ? ATTR_BONUS : 0);
  const dPow = attackInfo(ctx, defender, 0).power + (hasAttrAdvantage(ctx, defender, attacker) ? ATTR_BONUS : 0);
  defender.damage += aPow;
  attacker.damage += dPow; // retaliação

  if (atk.effect === "pierce" && state.status === "playing") {
    damageTamer(state, oppIdx, 1, active, events); // dano que "atravessa"
  }

  if (defender.damage >= maxHp(ctx, defender)) {
    triggerAbility(ctx, state, defender, "onDestroyed", events);
    deleteStack(state, oppIdx, defender, events);
  }
  if (attacker.damage >= maxHp(ctx, attacker)) {
    triggerAbility(ctx, state, attacker, "onDestroyed", events);
    deleteStack(state, active, attacker, events);
  }
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
  p.digiSoulMax = Math.min(ANIME_RULES.DIGISOUL_MAX, p.digiSoulMax + 1);
  p.digiSoul = p.digiSoulMax;
  events.push({ type: "turnChanged", player: opp, turn: state.turn });
  drawCard(state, opp, events);
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
