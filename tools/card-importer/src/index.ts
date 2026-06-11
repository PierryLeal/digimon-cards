/**
 * Importador de cartas (Fase 1).
 *
 * Baixa os dados públicos de um set (padrão BT01) da digimoncard.io, normaliza para o
 * schema de @digimon/cards, valida com Zod e grava em `packages/cards/data/<set>.json`.
 * NÃO baixa nem redistribui artes (apenas referencia a URL). IP da Bandai.
 *
 * Uso: pnpm import:cards            (BT01)
 *      TARGET_SET=BT01 pnpm import:cards
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cardSetSchema } from "@digimon/cards";
import { fetchSetByPrefix } from "./api.js";
import { normalizeSet } from "./normalize.js";

interface SetConfig {
  /** Prefixo usado na busca da API (match por prefixo). */
  prefix: string;
  /** Regex que valida os números pertencentes a este set. */
  idPattern: RegExp;
}

/** Mapa de sets suportados → como buscá-los. */
const SETS: Record<string, SetConfig> = {
  BT01: { prefix: "BT1-", idPattern: /^BT1-\d{3}$/ },
};

const here = dirname(fileURLToPath(import.meta.url));
const CARDS_DATA_DIR = resolve(here, "../../../packages/cards/data");

async function main(): Promise<void> {
  const set = (process.env.TARGET_SET ?? "BT01").toUpperCase();
  const cfg = SETS[set];
  if (!cfg) {
    throw new Error(`Set não suportado: ${set}. Suportados: ${Object.keys(SETS).join(", ")}`);
  }

  console.log(`[importer] baixando ${set} (prefixo "${cfg.prefix}")...`);
  const raw = await fetchSetByPrefix(cfg.prefix);
  console.log(`[importer] ${raw.length} entradas brutas recebidas (inclui artes alternativas).`);

  const cards = normalizeSet(raw, set, cfg.idPattern);
  console.log(`[importer] ${cards.length} cartas únicas normalizadas.`);

  const file = cardSetSchema.parse({
    set,
    generatedAt: new Date().toISOString(),
    cards,
  });

  const byKind = file.cards.reduce<Record<string, number>>((acc, c) => {
    acc[c.kind] = (acc[c.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[importer] composição: ${JSON.stringify(byKind)}`);

  const outPath = resolve(CARDS_DATA_DIR, `${set.toLowerCase()}.json`);
  await mkdir(CARDS_DATA_DIR, { recursive: true });
  await writeFile(outPath, JSON.stringify(file, null, 2) + "\n", "utf8");
  console.log(`[importer] gravado: ${outPath}`);
}

main().catch((err) => {
  console.error("[importer] falhou:", err);
  process.exitCode = 1;
});
