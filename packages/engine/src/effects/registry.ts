/**
 * Registry de efeitos: mapeia número da carta → handlers.
 * Cartas "vanilla" (sem efeito) simplesmente não se registram.
 */

import type { CardNumber } from "@digimon/shared";
import type { EffectHandlers } from "./types.js";

const REGISTRY = new Map<CardNumber, EffectHandlers>();

/** Define e registra o efeito de uma carta. Retorna os handlers (conveniência). */
export function defineEffect(number: CardNumber, handlers: EffectHandlers): EffectHandlers {
  if (REGISTRY.has(number)) {
    throw new Error(`Efeito já registrado para ${number}`);
  }
  REGISTRY.set(number, handlers);
  return handlers;
}

/** Retorna os handlers da carta, ou undefined se for vanilla. */
export function getEffect(number: CardNumber): EffectHandlers | undefined {
  return REGISTRY.get(number);
}

/** Números de cartas com efeito registrado (para diagnóstico/cobertura). */
export function registeredEffects(): CardNumber[] {
  return [...REGISTRY.keys()];
}
