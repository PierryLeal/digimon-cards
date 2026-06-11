import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CardDatabase, parseCardSet } from "@digimon/cards";
import type { CardNumber } from "@digimon/shared";
import type { EngineContext } from "../context.js";

const here = dirname(fileURLToPath(import.meta.url));
const bt01Path = resolve(here, "../../../cards/data/bt01.json");

export function loadContext(): EngineContext {
  const file = parseCardSet(JSON.parse(readFileSync(bt01Path, "utf8")));
  const db = new CardDatabase().add(file.cards);
  return { db };
}

/** Lista com `n` cópias do mesmo número de carta (decks de teste). */
export function repeat(number: CardNumber, n: number): CardNumber[] {
  return Array.from({ length: n }, () => number);
}

// Cartas de referência usadas nos testes (BT01).
export const AGUMON = "BT1-010"; // Digimon Lv.3 vermelho, DP 2000, custo 3, evolui de Lv.2 vermelho (custo 0)
export const YOKOMON = "BT1-001"; // Digi-Egg Lv.2 vermelho
