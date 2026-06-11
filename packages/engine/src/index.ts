export * from "./rng.js";
export * from "./state.js";
export * from "./context.js";
export * from "./errors.js";
export * from "./setup.js";
export * from "./reducer.js";
// Helpers de fluxo/ações/batalha úteis para testes e ferramentas.
export { beginTurn, endTurn, draw } from "./flow.js";
// Sistema de efeitos.
export { getEffect, registeredEffects } from "./effects/registry.js";
export { computeDp } from "./effects/triggers.js";
export type { EffectApi, EffectHandlers, DpQuery } from "./effects/types.js";
import "./effects/register.js";
