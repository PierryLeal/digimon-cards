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
import type { GameState, PendingAction } from "./state.js";
import { RuleError } from "./errors.js";
import { applyMulligan } from "./setup.js";
import { checkAutoEndTurn, endTurn } from "./flow.js";
import { digivolve, hatchEgg, moveFromBreeding, playCard } from "./actions.js";
import { attack } from "./battle.js";
import "./effects/register.js"; // registra todos os efeitos de carta implementados

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

  // Mulligan: independente de turno.
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

  // Resolver uma escolha pendente (o decisor pode ser o oponente).
  if (command.type === "resolveChoice") {
    resolveChoice(next, player, command.choiceId, command.selection);
    checkAutoEndTurn(next, events);
    return { state: next, events };
  }

  if (next.pendingChoice) {
    throw new RuleError("choice-pending", "Resolva a escolha pendente antes de continuar.");
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
      throw new RuleError("not-implemented", `"activateEffect" chega numa fase futura.`);
    default: {
      const _exhaustive: never = command;
      throw new RuleError("unknown-command", `Comando desconhecido: ${JSON.stringify(_exhaustive)}`);
    }
  }

  checkAutoEndTurn(next, events);
  return { state: next, events };
}

/** Valida e aplica a resolução de uma escolha pendente. */
function resolveChoice(
  state: GameState,
  player: PlayerIndex,
  choiceId: string,
  selection: string[],
): void {
  const pc = state.pendingChoice;
  if (!pc) throw new RuleError("no-pending-choice", "Não há escolha pendente.");
  if (pc.choiceId !== choiceId) throw new RuleError("choice-mismatch", "Escolha inválida.");
  if (player !== pc.player) throw new RuleError("not-your-choice", "Esta escolha não é sua.");
  if (selection.length < pc.min || selection.length > pc.max) {
    throw new RuleError("bad-selection-count", `Selecione entre ${pc.min} e ${pc.max}.`);
  }
  const valid = new Set(pc.options.map((o) => o.id));
  for (const id of selection) {
    if (!valid.has(id)) throw new RuleError("invalid-option", `Opção inválida: ${id}.`);
  }
  applyPendingAction(state, pc.action, selection);
  state.pendingChoice = null;
}

function applyPendingAction(state: GameState, action: PendingAction, selection: string[]): void {
  switch (action.kind) {
    case "unsuspendStacks": {
      const p = state.players[action.player];
      for (const id of selection) {
        const stack = p.battle.find((s) => s.id === id);
        if (stack) stack.suspended = false;
      }
      break;
    }
  }
}
