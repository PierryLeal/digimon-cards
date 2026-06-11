/**
 * Base de cartas do servidor + deck inicial pronto (para jogar sem deckbuilder ainda).
 */

import { loadBundledSet, type CardDatabase } from "@digimon/cards";
import type { CardNumber } from "@digimon/shared";
import type { EngineContext } from "@digimon/engine";

export const db: CardDatabase = loadBundledSet("BT01");
export const ctx: EngineContext = { db };

export interface DeckLists {
  deck: CardNumber[];
  eggDeck: CardNumber[];
}

/**
 * Monta um deck inicial mono-vermelho válido em tamanho (50 + 5), no máx. 4 cópias.
 * Provisório até o deckbuilder (Fase 6).
 */
export function makeStarterDeck(): DeckLists {
  const reds = db.all().filter((c) => c.colors.includes("red"));
  const mains = reds.filter((c) => c.kind !== "digi-egg").map((c) => c.number);
  const eggs = reds.filter((c) => c.kind === "digi-egg").map((c) => c.number);

  const deck = fill(mains, 50);
  const eggDeck = fill(eggs, 5);
  return { deck, eggDeck };
}

/** Preenche até `size` repetindo cada número no máx. 4 vezes. */
function fill(numbers: CardNumber[], size: number): CardNumber[] {
  const out: CardNumber[] = [];
  for (const num of numbers) {
    for (let k = 0; k < 4 && out.length < size; k++) out.push(num);
    if (out.length >= size) break;
  }
  if (out.length < size) {
    throw new Error(`Cartas insuficientes para montar deck de ${size} (got ${out.length}).`);
  }
  return out;
}
