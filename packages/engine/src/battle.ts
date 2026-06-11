/**
 * Batalha: declaração de ataque, checagem de Security, deleção e vitória.
 * (Sem efeitos de carta — chegam na Fase 3.)
 */

import type { AttackTarget, GameEvent } from "@digimon/shared";
import type { CardStack, GameState } from "./state.js";
import { opponentOf } from "./state.js";
import type { EngineContext } from "./context.js";
import { RuleError } from "./errors.js";
import { deleteStack, endGame, findStack } from "./flow.js";

function dpOf(ctx: EngineContext, stack: CardStack): number {
  return ctx.db.require(stack.cards[0]!.number).dp ?? 0;
}

export function attack(
  ctx: EngineContext,
  state: GameState,
  attackerId: string,
  target: AttackTarget,
  events: GameEvent[],
): void {
  const active = state.activePlayer;
  const me = state.players[active];

  const attacker = findStack(me, attackerId);
  if (!attacker) throw new RuleError("attacker-not-found", `Atacante ${attackerId} não encontrado.`);
  if (ctx.db.require(attacker.cards[0]!.number).kind !== "digimon") {
    throw new RuleError("attacker-not-digimon", "Apenas Digimons atacam.");
  }
  if (attacker.suspended) throw new RuleError("attacker-suspended", "Digimon suspenso não pode atacar.");
  if (attacker.playedThisTurn) {
    throw new RuleError("summoning-sickness", "Digimon não pode atacar no turno em que foi jogado.");
  }

  attacker.suspended = true;
  events.push({ type: "attackDeclared", attackerId, target });

  if (target.kind === "security") {
    resolveSecurityAttack(ctx, state, attacker, events);
  } else {
    resolveDigimonAttack(ctx, state, attacker, target.cardId, events);
  }
}

function resolveSecurityAttack(
  ctx: EngineContext,
  state: GameState,
  attacker: CardStack,
  events: GameEvent[],
): void {
  const active = state.activePlayer;
  const opp = opponentOf(active);
  const oppState = state.players[opp];

  if (oppState.security.length === 0) {
    events.push({ type: "securityChecked", player: opp, revealed: null });
    endGame(state, active, "direct-attack-no-security", events);
    return;
  }

  const sec = oppState.security.shift()!;
  events.push({ type: "securityChecked", player: opp, revealed: sec.number });
  const secDef = ctx.db.require(sec.number);

  if (secDef.kind === "digimon") {
    const attackerDp = dpOf(ctx, attacker);
    const securityDp = secDef.dp ?? 0;
    // O Digimon de Security sempre vai para o lixo após a checagem.
    oppState.trash.push(sec);
    events.push({ type: "cardMoved", cardId: sec.id, from: "security", to: "trash", player: opp });
    if (attackerDp <= securityDp) {
      deleteStack(state, attacker, events); // empate ou DP menor = atacante deletado
    }
  } else {
    // Tamer/Option de Security: efeito chega na Fase 3 → por ora vai para o lixo.
    oppState.trash.push(sec);
    events.push({ type: "cardMoved", cardId: sec.id, from: "security", to: "trash", player: opp });
  }
}

function resolveDigimonAttack(
  ctx: EngineContext,
  state: GameState,
  attacker: CardStack,
  defenderId: string,
  events: GameEvent[],
): void {
  const opp = opponentOf(state.activePlayer);
  const oppState = state.players[opp];
  const defender = findStack(oppState, defenderId);
  if (!defender) throw new RuleError("defender-not-found", `Alvo ${defenderId} não encontrado.`);
  if (ctx.db.require(defender.cards[0]!.number).kind !== "digimon") {
    throw new RuleError("target-not-digimon", "Só é possível atacar Digimons.");
  }
  if (!defender.suspended) {
    throw new RuleError("target-not-suspended", "Só Digimons suspensos podem ser atacados.");
  }

  const attackerDp = dpOf(ctx, attacker);
  const defenderDp = dpOf(ctx, defender);
  if (attackerDp >= defenderDp) deleteStack(state, defender, events);
  if (defenderDp >= attackerDp) deleteStack(state, attacker, events);
}
