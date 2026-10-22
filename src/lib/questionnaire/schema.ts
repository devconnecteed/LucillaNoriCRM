import { z } from "zod";
import type { QuestionnaireContent } from "./types";

// Validazione server-side del contenuto salvato dal builder.
const option = z.object({ id: z.string().min(1), label: z.string() });
const base = {
  id: z.string().min(1),
  label: z.string(),
  help: z.string().optional(),
  required: z.boolean().optional(),
};

const item = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("single"),
    options: z.array(option).min(1),
    correct: z.string().optional(),
    points: z.number().nonnegative().optional(),
  }),
  z.object({
    ...base,
    type: z.literal("multiple"),
    options: z.array(option).min(1),
    correct: z.array(z.string()).optional(),
    points: z.number().nonnegative().optional(),
    scoring: z.enum(["all_or_nothing", "partial"]).optional(),
  }),
  z.object({
    ...base,
    type: z.literal("scale"),
    min: z.number().int(),
    max: z.number().int(),
    minLabel: z.string().optional(),
    maxLabel: z.string().optional(),
    dimension: z.string().optional(),
  }),
  z.object({ ...base, type: z.literal("text"), long: z.boolean().optional() }),
  z.object({ ...base, type: z.literal("diary"), rows: z.array(option).min(1), days: z.array(z.string()).min(1) }),
  z.object({
    ...base,
    type: z.literal("rubric"),
    criteria: z.array(option).min(1),
    min: z.number().int(),
    max: z.number().int(),
    minLabel: z.string().optional(),
    maxLabel: z.string().optional(),
    dimensionPrefix: z.string().optional(),
  }),
  z.object({ ...base, type: z.literal("info") }),
  z.object({ ...base, type: z.literal("date") }),
]);

export const contentSchema = z.object({
  intro: z.string().optional(),
  outro: z.string().optional(),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      description: z.string().optional(),
      items: z.array(item),
    }),
  ),
});

export function parseContent(raw: unknown): QuestionnaireContent {
  return contentSchema.parse(raw) as QuestionnaireContent;
}
