/**
 * Importador do modo Anime: baixa linhas de digivolução curadas do digi-api.com,
 * normaliza para DigiCard (estágio, DP, evolui-de/para, imagem, efeito) e grava em
 * packages/cards/data/digidex.json. Veja docs/RULES_ANIME.md.
 *
 * Uso: pnpm import:digidex
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digidexSetSchema, type DigiCard, type Stage } from "@digimon/cards";

const API = process.env.DIGIAPI_BASE ?? "https://digi-api.com/api/v1";

interface Curated {
  name: string;
  stage: Stage;
}

/**
 * Linhas de digivolução do anime (rookie → mega). Nomes EXATOS do digi-api
 * (compostos usam espaço; Biyomon é "Piyomon" em JP).
 */
const LINES: Curated[][] = [
  [
    { name: "Agumon", stage: "rookie" },
    { name: "Greymon", stage: "champion" },
    { name: "Metal Greymon", stage: "ultimate" },
    { name: "War Greymon", stage: "mega" },
  ],
  [
    { name: "Gabumon", stage: "rookie" },
    { name: "Garurumon", stage: "champion" },
    { name: "Were Garurumon", stage: "ultimate" },
    { name: "Metal Garurumon", stage: "mega" },
  ],
  [
    { name: "Patamon", stage: "rookie" },
    { name: "Angemon", stage: "champion" },
    { name: "Holy Angemon", stage: "ultimate" },
    { name: "Seraphimon", stage: "mega" },
  ],
  [
    { name: "Piyomon", stage: "rookie" },
    { name: "Birdramon", stage: "champion" },
    { name: "Garudamon", stage: "ultimate" },
    { name: "Hououmon", stage: "mega" },
  ],
  [
    { name: "Palmon", stage: "rookie" },
    { name: "Togemon", stage: "champion" },
    { name: "Lilimon", stage: "ultimate" },
    { name: "Rosemon", stage: "mega" },
  ],
  [
    { name: "Gomamon", stage: "rookie" },
    { name: "Ikkakumon", stage: "champion" },
    { name: "Zudomon", stage: "ultimate" },
    { name: "Vikemon", stage: "mega" },
  ],
  [
    { name: "Tentomon", stage: "rookie" },
    { name: "Kabuterimon", stage: "champion" },
    { name: "Atlur Kabuterimon", stage: "ultimate" },
    { name: "Hercules Kabuterimon", stage: "mega" },
  ],
  [
    { name: "DORUmon", stage: "rookie" },
    { name: "DORUgamon", stage: "champion" },
    { name: "DORUguremon", stage: "ultimate" },
    { name: "DORUgoramon", stage: "mega" },
  ],
];

const TIER: Record<Stage, number> = {
  "in-training": 1,
  rookie: 2,
  champion: 3,
  ultimate: 4,
  mega: 5,
  armor: 3,
};
const DP: Record<Stage, number> = {
  "in-training": 2,
  rookie: 3,
  champion: 5,
  ultimate: 7,
  mega: 9,
  armor: 5,
};

/** Slug ASCII a partir do nome (os nomes do digi-api já são ASCII). */
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

interface ApiDigimon {
  id: number;
  name: string;
  images?: { href: string }[];
  types?: { type: string }[];
  attributes?: { attribute: string }[];
  skills?: { skill: string; description: string }[];
  priorEvolutions?: { digimon: string }[];
  nextEvolutions?: { digimon: string }[];
}

interface ApiSearch {
  content: { id: number; name: string }[];
}

/** Resolve um nome exato via busca e baixa os dados completos por id. */
async function fetchDigimon(name: string): Promise<ApiDigimon | null> {
  const search = await fetch(`${API}/digimon?name=${encodeURIComponent(name)}&pageSize=50`);
  if (!search.ok) return null;
  const data = (await search.json()) as Partial<ApiSearch>;
  const content = data.content ?? [];
  const match = content.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (!match) return null;
  const full = await fetch(`${API}/digimon/${match.id}`);
  if (!full.ok) return null;
  return (await full.json()) as ApiDigimon;
}

function toCard(api: ApiDigimon, c: Curated): DigiCard {
  const skill = api.skills?.[0];
  return {
    id: slugify(api.name),
    name: api.name,
    kind: "digimon",
    stage: c.stage,
    tier: TIER[c.stage],
    attribute: api.attributes?.[0]?.attribute,
    types: (api.types ?? []).map((t) => t.type).filter(Boolean),
    dp: DP[c.stage],
    // Linhas estritas: preenchidas por vizinhança depois (não usar as listas do digi-api,
    // que são permissivas demais — Agumon "evolui" em dezenas de coisas).
    evolvesFrom: [],
    evolvesInto: [],
    isX: /x-antibody|\(x\)/i.test(api.name),
    effectName: skill?.skill,
    effectText: skill?.description,
    image: api.images?.[0]?.href,
  };
}

/** Cartas de efeito feitas à mão (não vêm do digi-api). */
const OPTION_CARDS: DigiCard[] = [
  {
    id: "x-antibody",
    name: "X-Antibody",
    kind: "x-antibody",
    types: [],
    dp: 0,
    evolvesFrom: [],
    evolvesInto: [],
    isX: false,
    effectName: "X-Antibody",
    effectText: "Permite que 1 Digimon seu evolua para sua forma X-Antibody.",
  },
  {
    id: "recovery-disk",
    name: "Disco de Recuperação",
    kind: "option",
    types: [],
    dp: 0,
    evolvesFrom: [],
    evolvesInto: [],
    isX: false,
    effectName: "Recuperação",
    effectText: "Recupera 1 de HP do seu Tamer.",
  },
];

async function main(): Promise<void> {
  const cards: DigiCard[] = [];
  for (const line of LINES) {
    const built: DigiCard[] = [];
    for (const c of line) {
      const api = await fetchDigimon(c.name);
      if (!api) {
        console.warn(`[digidex] não encontrado no digi-api: ${c.name} (pulando)`);
        continue;
      }
      built.push(toCard(api, c));
      console.log(`[digidex] ${c.name} -> ${slugify(api.name)} (${c.stage}, DP ${DP[c.stage]})`);
    }
    // Liga cada carta apenas ao vizinho da própria linha (digivolução estrita, 1 estágio).
    built.forEach((card, i) => {
      card.evolvesFrom = i > 0 ? [built[i - 1]!.id] : [];
      card.evolvesInto = i < built.length - 1 ? [built[i + 1]!.id] : [];
    });
    cards.push(...built);
  }
  cards.push(...OPTION_CARDS);

  const file = digidexSetSchema.parse({ generatedAt: new Date().toISOString(), cards });

  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, "../../../packages/cards/data");
  const outPath = resolve(outDir, "digidex.json");
  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, JSON.stringify(file, null, 2) + "\n", "utf8");
  console.log(`[digidex] ${file.cards.length} cartas -> ${outPath}`);
}

main().catch((err) => {
  console.error("[digidex] falhou:", err);
  process.exitCode = 1;
});
