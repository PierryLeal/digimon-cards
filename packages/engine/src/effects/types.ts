/**
 * Tipos do sistema de efeitos.
 *
 * Cada carta com efeito registra um conjunto de handlers (hooks). O engine os dispara
 * nos momentos certos, passando uma API restrita (`EffectApi`) que só permite mutações
 * determinísticas e seguras sobre o estado. Veja docs/EFFECTS_GUIDE.md.
 */

import type { PlayerIndex } from "@digimon/shared";

/** Consulta para modificadores contínuos de DP. */
export interface DpQuery {
  /** O Digimon está atacando agora? (gatilho [When Attacking]) */
  attacking: boolean;
  /** É o turno do controlador deste Digimon? (gatilho [Your Turn]) */
  isYourTurn: boolean;
}

/**
 * API que os efeitos usam para alterar o jogo. Implementada em effects/api.ts.
 * Mantém os handlers das cartas ignorantes sobre a estrutura interna do estado.
 */
export interface EffectApi {
  /** Índice do controlador do efeito. */
  readonly owner: PlayerIndex;
  /** Índice do oponente. */
  readonly opponent: PlayerIndex;
  /** O controlador ganha `n` de memória (move o medidor para o lado dele). */
  gainMemory(n: number): void;
  /** O controlador compra `n` cartas. */
  draw(n: number): void;
  /** Desvira (unsuspend) até `count` Digimons seus (escolha, se houver mais de um). */
  unsuspendOwn(count: number): void;
  /** Agenda uma variação de memória do controlador para o fim do turno atual. */
  scheduleEndOfTurnMemory(delta: number): void;
}

/** Handlers que uma carta pode registrar. Todos opcionais. */
export interface EffectHandlers {
  /** [On Play] — ao ser jogada da mão. */
  onPlay?(api: EffectApi): void;
  /** [When Digivolving] — ao evoluir a partir desta carta. */
  whenDigivolving?(api: EffectApi): void;
  /** [When Attacking] — ao declarar ataque (inclui fontes de evolução). */
  whenAttacking?(api: EffectApi): void;
  /** [On Deletion] — quando a carta vai para o lixo (inclui fontes de evolução). */
  onDeletion?(api: EffectApi): void;
  /** [End of Turn] — durante a fase End do controlador. */
  endOfTurn?(api: EffectApi): void;
  /** Modificador contínuo de DP (efeito próprio ou herdado da pilha). */
  dpModifier?(query: DpQuery): number;
}
