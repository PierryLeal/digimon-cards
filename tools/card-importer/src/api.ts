/**
 * Cliente da API pública da digimoncard.io (somente dados de cartas — sem artes).
 */

/** Forma bruta de uma carta como retornada pela API (campos relevantes). */
export interface RawCard {
  id: string;
  name: string;
  type: string; // "Digi-Egg" | "Digimon" | "Tamer" | "Option"
  level: number | null;
  play_cost: number | null;
  evolution_cost: number | null;
  evolution_color: string | null;
  evolution_level: number | null;
  color: string | null;
  color2: string | null;
  digi_type: string | null;
  digi_type2: string | null;
  digi_type3: string | null;
  digi_type4: string | null;
  form: string | null;
  stage: string | null;
  dp: number | null;
  attribute: string | null;
  rarity: string | null;
  main_effect: string | null;
  source_effect: string | null;
  series: string;
  [key: string]: unknown;
}

const DEFAULT_BASE = "https://digimoncard.io/api-public";

/**
 * Busca todas as entradas cujo número começa com o prefixo do set (ex.: "BT1-").
 * A API faz match por prefixo e inclui artes alternativas (duplicadas por id).
 */
export async function fetchSetByPrefix(prefix: string, base = DEFAULT_BASE): Promise<RawCard[]> {
  const url = `${base}/search.php?card=${encodeURIComponent(prefix)}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`API respondeu ${res.status} ${res.statusText} para ${url}`);
  }
  const data = (await res.json()) as RawCard[];
  if (!Array.isArray(data)) {
    throw new Error("Resposta inesperada da API (esperado um array).");
  }
  return data;
}
