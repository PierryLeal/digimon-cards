/**
 * Carrega um set empacotado (ex.: bt01.json) do diretório `data/` deste pacote.
 * Usado pelo servidor/engine em runtime (Node). Não usar no browser.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CardDatabase, parseCardSet } from "./loader.js";

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../data");

/** Lê e valida `data/<set>.json`, devolvendo um CardDatabase pronto. */
export function loadBundledSet(set: string): CardDatabase {
  const path = resolve(DATA_DIR, `${set.toLowerCase()}.json`);
  const file = parseCardSet(JSON.parse(readFileSync(path, "utf8")));
  return new CardDatabase().add(file.cards);
}
