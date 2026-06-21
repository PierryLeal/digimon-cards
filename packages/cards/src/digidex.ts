/**
 * Modelo de cartas do modo Anime (homebrew). Fonte: digi-api.com.
 * Cada carta tem estágio, DP, linhas de digivolução (evolui-de/para), imagem e efeito.
 * Veja docs/RULES_ANIME.md.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const stageSchema = z.enum([
  "in-training",
  "rookie",
  "champion",
  "ultimate",
  "mega",
  "armor",
]);
export type Stage = z.infer<typeof stageSchema>;

export const digiKindSchema = z.enum(["digimon", "x-antibody", "fusion", "option"]);
export type DigiKind = z.infer<typeof digiKindSchema>;

export const digiCardSchema = z.object({
  /** Slug único, ex.: "greymon". */
  id: z.string().min(1),
  name: z.string().min(1),
  kind: digiKindSchema.default("digimon"),
  stage: stageSchema.optional(),
  /** Ordem de estágio (rookie=2 … mega=5) para jogar/evoluir. */
  tier: z.number().int().optional(),
  attribute: z.string().optional(),
  types: z.array(z.string()).default([]),
  /** Poder de batalha. */
  dp: z.number().int().nonnegative().default(0),
  /** Slugs dos Digimon dos quais esta carta é evolução. */
  evolvesFrom: z.array(z.string()).default([]),
  /** Slugs das evoluções desta carta. */
  evolvesInto: z.array(z.string()).default([]),
  /** Forma X-Antibody. */
  isX: z.boolean().default(false),
  effectName: z.string().optional(),
  effectText: z.string().optional(),
  image: z.string().url().optional(),
});
export type DigiCard = z.infer<typeof digiCardSchema>;

export const digidexSetSchema = z.object({
  generatedAt: z.string(),
  cards: z.array(digiCardSchema),
});
export type DigidexSet = z.infer<typeof digidexSetSchema>;

export function parseDigidex(raw: unknown): DigidexSet {
  return digidexSetSchema.parse(raw);
}

/** Índice de consulta da base do modo Anime. */
export class DigiDatabase {
  private readonly byId = new Map<string, DigiCard>();

  add(cards: readonly DigiCard[]): this {
    for (const c of cards) this.byId.set(c.id, c);
    return this;
  }
  get(id: string): DigiCard | undefined {
    return this.byId.get(id);
  }
  require(id: string): DigiCard {
    const c = this.byId.get(id);
    if (!c) throw new Error(`Carta desconhecida na digidex: ${id}`);
    return c;
  }
  all(): DigiCard[] {
    return [...this.byId.values()];
  }
  get size(): number {
    return this.byId.size;
  }
  /**
   * Pode `evolution` evoluir sobre `base`? Exige estágio superior (os dados do digi-api
   * listam evoluções nos dois sentidos) + estar na linha de digivolução.
   */
  canDigivolve(base: DigiCard, evolution: DigiCard): boolean {
    if (base.tier !== undefined && evolution.tier !== undefined && evolution.tier <= base.tier) {
      return false;
    }
    return evolution.evolvesFrom.includes(base.id) || base.evolvesInto.includes(evolution.id);
  }
}

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../data");

/** Lê e valida `data/digidex.json`, devolvendo uma DigiDatabase. */
export function loadBundledDigidex(): DigiDatabase {
  const path = resolve(DATA_DIR, "digidex.json");
  const set = parseDigidex(JSON.parse(readFileSync(path, "utf8")));
  return new DigiDatabase().add(set.cards);
}
