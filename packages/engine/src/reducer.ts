/**
 * Reducer do engine: a ÚNICA forma de evoluir o estado da partida.
 *
 *   reduce(ctx, state, command, player) => { state, events }   (ou lança RuleError)
 *
 * Puro e determinístico: clona o estado, aplica o comando sobre o clone e devolve o
 * novo estado + os eventos atômicos gerados. O servidor é autoritativo e re-valida
 * todo comando aqui. Veja docs/ARCHITECTURE.md.
 */

import type { GameCommand, GameEvent, PlayerIndex } from "@digimon/shared";
import type { EngineContext } from "./context.js";
import type { GameState } from "./state.js";
import { RuleError } from "./errors.js";
import { applyMulligan } from "./setup.js";
import { endTurn } from "./flow.js";
import { digivolve, hatchEgg, moveFromBreeding, playCard } from "./actions.js";
import { attack } from "./battle.js";

export interface ReduceResult {
  state: GameState;
  events: GameEvent[];
}

export function reduce(
  ctx: EngineContext,
  state: GameState,
  command: GameCommand,
  player: PlayerIndex,
): ReduceResult {
  if (state.status === "ended") {
    throw new RuleError("game-over", "A partida já terminou.");
  }

  const next = structuredClone(state);
  const events: GameEvent[] = [];

  if (command.type === "mulligan") {
    if (next.status !== "mulligan") throw new RuleError("not-mulligan-phase", "Fora da fase de mulligan.");
    if (next.players[player].hasMulliganed) {
      throw new RuleError("already-mulliganed", "Você já decidiu o mulligan.");
    }
    applyMulligan(next, player, command.keep, events);
    return { state: next, events };
  }

  if (next.status !== "playing") {
    throw new RuleError("not-playing", "A partida ainda não começou (mulligan pendente).");
  }
  if (player !== next.activePlayer) {
    throw new RuleError("not-your-turn", "Não é o seu turno.");
  }

  switch (command.type) {
    case "playCard":
      playCard(ctx, next, command.cardId, events);
      break;
    case "digivolve":
      digivolve(ctx, next, command.sourceId, command.targetId, events);
      break;
    case "hatchEgg":
      hatchEgg(next, events);
      break;
    case "moveFromBreeding":
      moveFromBreeding(ctx, next, events);
      break;
    case "attack":
      attack(ctx, next, command.attackerId, command.target, events);
      break;
    case "passTurn":
      endTurn(next, events);
      break;
    case "activateEffect":
    case "resolveChoice":
      throw new RuleError("not-implemented", `"${command.type}" chega na Fase 3 (efeitos).`);
    default: {
      const _exhaustive: never = command;
      throw new RuleError("unknown-command", `Comando desconhecido: ${JSON.stringify(_exhaustive)}`);
    }
  }

  return { state: next, events };
}
