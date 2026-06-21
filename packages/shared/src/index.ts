export * from "./types.js";
export * from "./zones.js";
export * from "./phases.js";
export * from "./protocol.js";
export * from "./view.js";
export * from "./anime.js";

/** Constantes globais de regra do DCG. */
export const RULES = {
  /** Tamanho do deck principal. */
  MAIN_DECK_SIZE: 50,
  /** Máximo de Digi-Eggs. */
  MAX_EGG_DECK_SIZE: 5,
  /** Máximo de cópias da mesma carta no deck. */
  MAX_COPIES: 4,
  /** Cartas iniciais na mão. */
  STARTING_HAND: 5,
  /** Cartas na pilha de segurança no início. */
  STARTING_SECURITY: 5,
  /** Limites do medidor de memória. */
  MEMORY_MIN: -10,
  MEMORY_MAX: 10,
} as const;
