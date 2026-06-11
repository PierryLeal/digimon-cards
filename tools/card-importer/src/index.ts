/**
 * Importador de cartas (Fase 1).
 *
 * Objetivo: baixar os dados públicos das cartas de um set (ex.: BT01) da
 * digimoncard.io, normalizar para o nosso schema (@digimon/cards) e gravar em
 * `packages/cards/data/<set>.json`. NÃO baixa nem redistribui artes (IP Bandai).
 *
 * Fase 0: apenas o esqueleto + contrato. A implementação real chega na Fase 1.
 */

const CARD_API_BASE = process.env.CARD_API_BASE ?? "https://digimoncard.io/api-public";
const TARGET_SET = process.env.TARGET_SET ?? "BT01";

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[importer] alvo: ${TARGET_SET} via ${CARD_API_BASE}`);
  // eslint-disable-next-line no-console
  console.log("[importer] implementação real na Fase 1 (fetch → normalizar → validar → gravar).");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[importer] falhou:", err);
  process.exitCode = 1;
});
