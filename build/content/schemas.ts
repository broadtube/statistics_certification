import { z } from 'zod';

/** ID は URL と学習記録のキーを兼ねる（英小文字・数字・ハイフン） */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const idSchema = z.string().regex(ID_PATTERN, 'IDは英小文字・数字・ハイフンのみ使用できます');

const nonEmpty = z.string().trim().min(1, '空にできません');

export const categorySchema = z.object({
  id: idSchema,
  title: nonEmpty,
  order: z.number(),
  description: z.string().optional(),
  /** 模試での出題比率の重み */
  mockWeight: z.number().min(0).default(1),
});
export const categoriesFileSchema = z.array(categorySchema);

export const topicFrontmatterSchema = z.object({
  title: nonEmpty,
  category: idSchema,
  order: z.number(),
  summary: nonEmpty,
  distributions: z.array(idSchema).optional(),
  /** 本文が未執筆の分野（分野マップには「準備中」として表示する） */
  draft: z.boolean().default(false),
});

export const formulaSchema = z.object({
  id: idSchema,
  topic: idSchema,
  title: nonEmpty,
  description: z.string().optional(),
  body: nonEmpty,
  variables: z.array(z.object({ symbol: nonEmpty, meaning: nonEmpty })).optional(),
  conditions: z.string().optional(),
  derivation: z.string().optional(),
  pitfalls: z.string().optional(),
  tags: z.array(nonEmpty).default([]),
});
export const formulasFileSchema = z.array(formulaSchema);

export const RELATION_KINDS = ['special-case', 'limit', 'transform', 'sum', 'conjugate'] as const;

export const distributionSchema = z.object({
  title: nonEmpty,
  kind: z.enum(['discrete', 'continuous']),
  interactive: z.boolean(),
  order: z.number().default(100),
  pmfOrPdf: nonEmpty,
  cdf: z.string().optional(),
  mean: nonEmpty,
  variance: nonEmpty,
  mgf: z.string().optional(),
  notes: z.string().optional(),
  paramsDoc: z.array(z.object({ symbol: nonEmpty, meaning: nonEmpty, range: nonEmpty })),
  relations: z.array(z.object({ to: idSchema, kind: z.enum(RELATION_KINDS), label: nonEmpty })).default([]),
  diagramPosition: z.object({ x: z.number(), y: z.number() }),
});

const exprSchema = z.union([z.string().trim().min(1), z.number()]);

const paramRangeSchema = z
  .object({ min: z.number(), max: z.number(), step: z.number() })
  .superRefine((r, ctx) => {
    if (r.min > r.max) ctx.addIssue({ code: 'custom', message: 'min は max 以下にしてください' });
    if (!(r.step > 0)) ctx.addIssue({ code: 'custom', message: 'step は正の数にしてください' });
  });

const choiceSchema = z.object({
  id: z.string().regex(/^[a-z]$/, '選択肢IDは英小文字1文字です'),
  text: nonEmpty,
  value: exprSchema.optional(),
  correct: z.boolean(),
});

export const problemSchema = z
  .object({
    topics: z.array(idSchema).min(1, '1つ以上の分野が必要です'),
    formulas: z.array(idSchema).default([]),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    type: z.enum(['choice', 'numeric']),
    source: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('original') }),
      z.object({ kind: z.literal('reference'), exam: nonEmpty, question: nonEmpty }),
    ]),
    statement: nonEmpty,
    explanation: nonEmpty,
    params: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), paramRangeSchema).optional(),
    derived: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), exprSchema).optional(),
    constraints: z.array(z.string().trim().min(1)).optional(),
    variants: z.number().int().min(1).max(50).default(20),
    answer: exprSchema.optional(),
    display: z.object({ digits: z.number().int().min(0).max(10) }).optional(),
    tolerance: z.object({ type: z.enum(['absolute', 'relative']), value: z.number().positive() }).optional(),
    choices: z.array(choiceSchema).optional(),
    shuffleChoices: z.boolean().default(true),
  })
  .superRefine((p, ctx) => {
    if (p.type === 'choice') {
      if (!p.choices || p.choices.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['choices'], message: '選択式には2つ以上の選択肢が必要です' });
      } else {
        const correct = p.choices.filter((c) => c.correct).length;
        if (correct !== 1) {
          ctx.addIssue({ code: 'custom', path: ['choices'], message: `正答の選択肢はちょうど1つにしてください（現在 ${correct} 個）` });
        }
        const ids = p.choices.map((c) => c.id);
        if (new Set(ids).size !== ids.length) {
          ctx.addIssue({ code: 'custom', path: ['choices'], message: '選択肢IDが重複しています' });
        }
      }
    }
    if (p.type === 'numeric' && p.answer === undefined) {
      ctx.addIssue({ code: 'custom', path: ['answer'], message: '数値入力式には正答（answer）が必要です' });
    }
  });

export type Category = z.infer<typeof categorySchema>;
export type FormulaData = z.infer<typeof formulaSchema>;
export type DistributionData = z.infer<typeof distributionSchema>;
export type ProblemData = z.infer<typeof problemSchema>;
export type TopicFrontmatter = z.infer<typeof topicFrontmatterSchema>;
