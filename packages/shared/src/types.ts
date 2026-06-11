/**
 * Tipos de domínio do Digimon Card Game (DCG).
 * Apenas dados/estrutura — sem lógica de regra (essa vive em @digimon/engine).
 */

/** Cores das cartas. Uma carta pode ter mais de uma cor (dual-color). */
export type CardColor = "red" | "blue" | "yellow" | "green" | "black" | "white" | "purple";

/** Categorias de carta no DCG. */
export type CardKind = "digi-egg" | "digimon" | "tamer" | "option";

/**
 * "Nível" (Lv.) da carta. Digi-Eggs são Lv.2; Digimons vão de Lv.3 a Lv.7.
 * Tamers/Options não têm nível.
 */
export type CardLevel = 2 | 3 | 4 | 5 | 6 | 7;

/** Identificador único da carta no jogo, ex.: "BT1-085". */
export type CardNumber = string;

/** Custo de evolução: cor de origem + custo em memória. */
export interface DigivolveCost {
  /** Cor exigida na carta de baixo da pilha. */
  color: CardColor;
  /** Nível exigido na carta de baixo (ex.: evoluir de Lv.3 para Lv.4). */
  fromLevel: CardLevel;
  /** Custo em memória. */
  cost: number;
}

/** Definição estática de uma carta (vinda da base, imutável durante a partida). */
export interface CardDefinition {
  number: CardNumber;
  name: string;
  kind: CardKind;
  colors: CardColor[];
  level?: CardLevel;
  /** DP (Digimon Power). Apenas Digimons. */
  dp?: number;
  /** Custo para jogar direto (play cost). Digimons/Tamers/Options. */
  playCost?: number;
  digivolveCosts: DigivolveCost[];
  /** Atributo (ex.: "Vaccine", "Virus", "Data", "Free"). */
  attribute?: string;
  /** Tipo (ex.: "Dragon's Roar", "Holy Warrior"). */
  types: string[];
  /** Formas/estágio (ex.: "Rookie", "Champion", "Ultimate", "Mega"). */
  forms: string[];
  /** Texto de efeito principal (humano). A lógica é implementada por handler. */
  effectText?: string;
  /** Texto do efeito herdado (inherited / pilha de evolução). */
  inheritedEffectText?: string;
  /** Texto do efeito de segurança (security). */
  securityEffectText?: string;
  /** Conjunto/coleção, ex.: "BT01". */
  set: string;
  /** Raridade, ex.: "C", "U", "R", "SR", "SEC". */
  rarity?: string;
  /** URL de referência da arte (não baixada/redistribuída). */
  imageRef?: string;
}

/** Uma carta de deck, identificada pela definição + quantidade. */
export interface DeckEntry {
  number: CardNumber;
  count: number;
}

/** Deck de um jogador (deck principal + deck de Digi-Eggs). */
export interface Deck {
  id: string;
  name: string;
  /** 50 cartas (Digimon/Tamer/Option). */
  main: DeckEntry[];
  /** Até 5 Digi-Eggs. */
  eggs: DeckEntry[];
}
