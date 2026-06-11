/**
 * Fases do turno no Digimon Card Game, na ordem em que ocorrem.
 *
 * 1. Unsuspend — vira todas as suas cartas suspensas para ativas.
 * 2. Draw      — compra 1 carta (o jogador do 1º turno não compra).
 * 3. Breeding  — opcional: mover/eclodir/evoluir na área de criação.
 * 4. Main      — jogar/evoluir cartas, atacar, ativar efeitos (gasta memória).
 * 5. End       — efeitos de fim de turno; passa o turno.
 */
export const PHASES = ["unsuspend", "draw", "breeding", "main", "end"] as const;

export type Phase = (typeof PHASES)[number];

/** Índice do jogador (sempre 2 jogadores: 0 e 1). */
export type PlayerIndex = 0 | 1;
