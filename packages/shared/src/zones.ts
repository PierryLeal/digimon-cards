/**
 * Zonas do tabuleiro do Digimon Card Game.
 */

export const ZONES = [
  "deck", // deck principal (50 cartas)
  "eggDeck", // deck de Digi-Eggs (até 5)
  "hand", // mão
  "security", // pilha de segurança (face down)
  "breeding", // área de criação (1 slot — onde o ovo eclode/evolui)
  "battle", // área de batalha (Digimons/Tamers/Options em jogo)
  "trash", // lixo / cemitério
] as const;

export type Zone = (typeof ZONES)[number];

/** Zonas cuja informação é oculta para o oponente. */
export const HIDDEN_ZONES: ReadonlySet<Zone> = new Set<Zone>(["deck", "eggDeck", "hand", "security"]);

/** Estado de orientação de uma carta em jogo. */
export type CardOrientation = "active" | "suspended";
