/**
 * Implementação da EffectApi: a ponte segura entre os handlers das cartas e o estado.
 */

import type { GameEvent, PlayerIndex } from "@digimon/shared";
import type { GameState } from "../state.js";
import { opponentOf } from "../state.js";
import { draw, setMemory } from "../flow.js";
import type { EffectApi } from "./types.js";

/** Aplica memória do ponto de vista do controlador (não necessariamente o ativo). */
function gainMemoryFor(state: GameState, owner: PlayerIndex, n: number, events: GameEvent[]): void {
  const sign = owner === state.activePlayer ? 1 : -1;
  setMemory(state, state.memory + sign * n, events);
}

export function createApi(state: GameState, owner: PlayerIndex, events: GameEvent[]): EffectApi {
  return {
    owner,
    opponent: opponentOf(owner),

    gainMemory(n: number): void {
      gainMemoryFor(state, owner, n, events);
    },

    draw(n: number): void {
      draw(state, owner, n, events);
    },

    unsuspendOwn(count: number): void {
      const me = state.players[owner];
      const suspended = me.battle.filter((s) => s.suspended);
      if (suspended.length === 0) return;
      if (suspended.length <= count) {
        for (const s of suspended) s.suspended = false;
        return;
      }
      state.pendingChoice = {
        choiceId: `choice-${state.nextId++}`,
        player: owner,
        prompt: `Desvire ${count} Digimon seu(s).`,
        options: suspended.map((s) => ({ id: s.id, label: s.cards[0]!.number })),
        min: count,
        max: count,
        action: { kind: "unsuspendStacks", player: owner },
      };
    },

    scheduleEndOfTurnMemory(delta: number): void {
      state.delayedEndOfTurn.push({ kind: "memory", owner, delta });
    },
  };
}
