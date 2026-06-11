/**
 * Disparo de hooks e cálculo de DP com modificadores.
 */

import type { GameEvent } from "@digimon/shared";
import type { EngineContext } from "../context.js";
import type { CardInstance, CardStack, GameState } from "../state.js";
import { createApi } from "./api.js";
import { getEffect } from "./registry.js";
import type { EffectHandlers } from "./types.js";

type TriggerHook = "onPlay" | "whenDigivolving" | "whenAttacking" | "onDeletion" | "endOfTurn";

/** Dispara um hook para uma carta específica (se ela tiver esse handler). */
export function triggerCard(
  state: GameState,
  card: CardInstance,
  hook: TriggerHook,
  events: GameEvent[],
): void {
  if (state.pendingChoice) return; // não acumula efeitos enquanto há escolha aberta
  const handler = getEffect(card.number)?.[hook] as EffectHandlers[TriggerHook] | undefined;
  if (!handler) return;
  handler(createApi(state, card.owner, events));
}

/** Dispara um hook para todas as cartas de uma pilha (topo + fontes de evolução). */
export function triggerStack(
  state: GameState,
  stack: CardStack,
  hook: TriggerHook,
  events: GameEvent[],
): void {
  for (const card of stack.cards) {
    if (state.pendingChoice) break;
    triggerCard(state, card, hook, events);
  }
}

/** DP efetivo de uma pilha: base do topo + modificadores contínuos de toda a pilha. */
export function computeDp(
  ctx: EngineContext,
  state: GameState,
  stack: CardStack,
  attacking: boolean,
): number {
  const top = stack.cards[0]!;
  let dp = ctx.db.require(top.number).dp ?? 0;
  const isYourTurn = top.owner === state.activePlayer;
  for (const card of stack.cards) {
    const mod = getEffect(card.number)?.dpModifier;
    if (mod) dp += mod({ attacking, isYourTurn });
  }
  return Math.max(0, dp);
}
