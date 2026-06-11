/**
 * Reducer do engine: a ÚNICA forma de evoluir o estado da partida.
 *
 *   reduce(state, command, rng) => { state, events } | RuleError
 *
 * Puro e determinístico. Será implementado de fato na Fase 2 (core de regras).
 * Por enquanto é o contrato + esqueleto, para fixar os tipos compartilhados.
 */

import type { GameCommand, GameEvent } from "@digimon/shared";
import type { GameState } from "./state.js";
import type { Rng } from "./rng.js";

/** Erro de regra: o comando não é válido no estado atual. */
export class RuleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RuleError";
  }
}

export interface ReduceResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * Aplica um comando ao estado. Implementação real chega na Fase 2.
 * Aqui apenas garante a assinatura usada por server e client.
 */
export function reduce(_state: GameState, command: GameCommand, _rng: Rng): ReduceResult {
  throw new RuleError("not-implemented", `Comando "${command.type}" ainda não implementado (Fase 2).`);
}
