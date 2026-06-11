/**
 * Carregamento e indexação da base de cartas.
 */

import type { CardDefinition, CardNumber } from "@digimon/shared";
import { cardSetSchema, type CardSetFile } from "./schema.js";

/** Valida um arquivo de set bruto (JSON) contra o schema. */
export function parseCardSet(raw: unknown): CardSetFile {
  return cardSetSchema.parse(raw);
}

/** Índice de consulta rápida por número de carta. */
export class CardDatabase {
  private readonly byNumber = new Map<CardNumber, CardDefinition>();

  add(cards: readonly CardDefinition[]): this {
    for (const card of cards) {
      this.byNumber.set(card.number, card as CardDefinition);
    }
    return this;
  }

  get(number: CardNumber): CardDefinition | undefined {
    return this.byNumber.get(number);
  }

  require(number: CardNumber): CardDefinition {
    const card = this.byNumber.get(number);
    if (!card) throw new Error(`Carta desconhecida na base: ${number}`);
    return card;
  }

  get size(): number {
    return this.byNumber.size;
  }

  all(): CardDefinition[] {
    return [...this.byNumber.values()];
  }
}
