/**
 * Base de cartas (modo Anime) + deck inicial pronto.
 */

import { loadBundledDigidex, type DigiDatabase } from "@digimon/cards";
import { anime } from "@digimon/engine";

export const db: DigiDatabase = loadBundledDigidex();
export const ctx: anime.AnimeContext = { db };

/** Deck inicial: todos os Digimon da digidex (1 cópia cada). Provisório (Fase 6). */
export function makeStarterDeck(): string[] {
  return db
    .all()
    .filter((c) => c.kind === "digimon")
    .map((c) => c.id);
}
