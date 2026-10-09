import type { Category, FormulaSource, LoadedContent, ProblemSource, TopicSource } from '../content/types';

export function topicsByCategory(content: LoadedContent): { category: Category; topics: TopicSource[] }[] {
  return [...content.categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      topics: content.topics.filter((t) => t.category === category.id).sort((a, b) => a.order - b.order),
    }));
}

export function countsByTopic(content: LoadedContent): Map<string, { formulas: number; problems: number }> {
  const out = new Map(content.topics.map((t) => [t.id, { formulas: 0, problems: 0 }]));
  for (const f of content.formulas) {
    const c = out.get(f.topic);
    if (c) c.formulas++;
  }
  for (const p of content.problems) {
    for (const t of p.topics) {
      const c = out.get(t);
      if (c) c.problems++;
    }
  }
  return out;
}

export const formulasOfTopic = (content: LoadedContent, topicId: string): FormulaSource[] =>
  content.formulas.filter((f) => f.topic === topicId);

export const problemsOfTopic = (content: LoadedContent, topicId: string): ProblemSource[] =>
  content.problems.filter((p) => p.topics.includes(topicId));

export const problemsOfFormula = (content: LoadedContent, formulaId: string): ProblemSource[] =>
  content.problems.filter((p) => p.formulas.includes(formulaId));
