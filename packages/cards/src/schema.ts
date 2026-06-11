/**
 * Schema de validação (Zod) para a base de cartas normalizada.
 * O importador (tools/card-importer) gera JSON que DEVE passar por este schema
 * antes de ser usado pelo engine.
 */

import { z } from "zod";

export const cardColorSchema = z.enum([
  "red",
  "blue",
  "yellow",
  "green",
  "black",
  "white",
  "purple",
]);

export const cardKindSchema = z.enum(["digi-egg", "digimon", "tamer", "option"]);

export const cardLevelSchema = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

export const digivolveCostSchema = z.object({
  color: cardColorSchema,
  fromLevel: cardLevelSchema,
  cost: z.number().int().nonnegative(),
});

export const cardDefinitionSchema = z.object({
  number: z.string().min(1),
  name: z.string().min(1),
  kind: cardKindSchema,
  colors: z.array(cardColorSchema).min(1),
  level: cardLevelSchema.optional(),
  dp: z.number().int().optional(),
  playCost: z.number().int().nonnegative().optional(),
  digivolveCosts: z.array(digivolveCostSchema).default([]),
  attribute: z.string().optional(),
  types: z.array(z.string()).default([]),
  forms: z.array(z.string()).default([]),
  effectText: z.string().optional(),
  inheritedEffectText: z.string().optional(),
  securityEffectText: z.string().optional(),
  set: z.string().min(1),
  rarity: z.string().optional(),
  imageRef: z.string().url().optional(),
});

export const cardSetSchema = z.object({
  set: z.string().min(1),
  generatedAt: z.string(),
  cards: z.array(cardDefinitionSchema),
});

export type CardSetFile = z.infer<typeof cardSetSchema>;
