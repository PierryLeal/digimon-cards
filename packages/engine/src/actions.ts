/**
 * Ações da fase principal: jogar, evoluir, eclodir e mover da criação.
 */

import type { CardColor, CardInstanceId, GameEvent } from "@digimon/shared";
import type { EngineContext } from "./context.js";
import type { CardStack, GameState } from "./state.js";
import { RuleError } from "./errors.js";
import { draw, findStack, makeStack, setMemory } from "./flow.js";
import { triggerCard } from "./effects/triggers.js";

function takeFromHand(state: GameState, player: 0 | 1, cardId: CardInstanceId) {
  const p = state.players[player];
  const idx = p.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new RuleError("card-not-in-hand", `Carta ${cardId} não está na mão.`);
  return p.hand[idx]!;
}

/** Joga uma carta da mão pagando o custo de memória. */
export function playCard(
  ctx: EngineContext,
  state: GameState,
  cardId: CardInstanceId,
  events: GameEvent[],
): void {
  const active = state.activePlayer;
  const p = state.players[active];
  const card = takeFromHand(state, active, cardId);
  const def = ctx.db.require(card.number);

  if (def.kind === "digi-egg") {
    throw new RuleError("cannot-play-egg", "Digi-Eggs não são jogados da mão (use hatchEgg).");
  }

  const cost = def.playCost ?? 0;
  setMemory(state, state.memory - cost, events);
  p.hand = p.hand.filter((c) => c.id !== cardId);

  if (def.kind === "option") {
    // Option: o efeito [Main] roda via onPlay; vanilla resolve "nada". Vai para o lixo.
    p.trash.push(card);
    events.push({ type: "cardMoved", cardId, from: "hand", to: "trash", player: active });
  } else {
    const stack = makeStack(card);
    stack.playedThisTurn = def.kind === "digimon"; // Tamers não atacam, enjoo é irrelevante
    p.battle.push(stack);
    events.push({ type: "cardMoved", cardId, from: "hand", to: "battle", player: active });
  }

  triggerCard(state, card, "onPlay", events);
}

function findDigivolveTarget(state: GameState, player: 0 | 1, targetId: CardInstanceId): CardStack {
  const p = state.players[player];
  const inBattle = findStack(p, targetId);
  if (inBattle) return inBattle;
  if (p.breeding && p.breeding.id === targetId) return p.breeding;
  throw new RuleError("target-not-found", `Alvo de evolução ${targetId} não encontrado.`);
}

/** Evolui uma carta da mão sobre um Digimon em jogo (ou na criação), pagando o custo. */
export function digivolve(
  ctx: EngineContext,
  state: GameState,
  sourceId: CardInstanceId,
  targetId: CardInstanceId,
  events: GameEvent[],
): void {
  const active = state.activePlayer;
  const p = state.players[active];
  const source = takeFromHand(state, active, sourceId);
  const sourceDef = ctx.db.require(source.number);
  if (sourceDef.kind !== "digimon") {
    throw new RuleError("source-not-digimon", "Apenas Digimons evoluem sobre outro Digimon.");
  }

  const target = findDigivolveTarget(state, active, targetId);
  const targetDef = ctx.db.require(target.cards[0]!.number);

  const matches = sourceDef.digivolveCosts.filter(
    (dc) =>
      targetDef.level === dc.fromLevel && targetDef.colors.includes(dc.color as CardColor),
  );
  if (matches.length === 0) {
    throw new RuleError(
      "illegal-digivolution",
      `${source.number} não pode evoluir de ${target.cards[0]!.number} (nível/cor incompatíveis).`,
    );
  }
  const cost = Math.min(...matches.map((m) => m.cost));

  setMemory(state, state.memory - cost, events);
  p.hand = p.hand.filter((c) => c.id !== sourceId);
  target.cards.unshift(source); // novo topo; fontes de evolução abaixo
  target.playedThisTurn = false; // evoluir tira o enjoo de invocação
  events.push({ type: "cardDigivolved", sourceId, targetId: target.id });
  events.push({ type: "cardMoved", cardId: sourceId, from: "hand", to: "battle", player: active });

  triggerCard(state, source, "whenDigivolving", events);
  draw(state, active, 1, events); // bônus de evolução
}

/** Eclode um Digi-Egg na área de criação (se vazia). */
export function hatchEgg(state: GameState, events: GameEvent[]): void {
  const active = state.activePlayer;
  const p = state.players[active];
  if (p.breeding) throw new RuleError("breeding-occupied", "A área de criação já está ocupada.");
  const egg = p.eggDeck.shift();
  if (!egg) throw new RuleError("egg-deck-empty", "Não há Digi-Eggs para eclodir.");
  p.breeding = makeStack(egg);
  events.push({ type: "cardMoved", cardId: egg.id, from: "eggDeck", to: "breeding", player: active });
}

/** Move o Digimon da criação (Lv.3+) para a área de batalha (1x por turno). */
export function moveFromBreeding(ctx: EngineContext, state: GameState, events: GameEvent[]): void {
  const active = state.activePlayer;
  const p = state.players[active];
  if (!p.breeding) throw new RuleError("breeding-empty", "Não há Digimon na criação.");
  if (p.movedFromBreedingThisTurn) {
    throw new RuleError("already-moved", "Você já moveu da criação neste turno.");
  }
  const def = ctx.db.require(p.breeding.cards[0]!.number);
  if (!def.level || def.level < 3) {
    throw new RuleError("breeding-not-ready", "Só Digimons Lv.3+ podem sair da criação.");
  }
  const stack = p.breeding;
  stack.playedThisTurn = false; // pode atacar
  p.battle.push(stack);
  p.breeding = null;
  p.movedFromBreedingThisTurn = true;
  events.push({ type: "cardMoved", cardId: stack.id, from: "breeding", to: "battle", player: active });
}
