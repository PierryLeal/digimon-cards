/**
 * Contexto do engine: dependências externas puras necessárias para resolver regras.
 * Hoje só a base de cartas (para ler custos, DP, níveis, cores).
 */

import type { CardDatabase } from "@digimon/cards";

export interface EngineContext {
  db: CardDatabase;
}
