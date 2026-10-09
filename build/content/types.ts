import type { Category, DistributionData, FormulaData, ProblemData, TopicFrontmatter } from './schemas';

export interface ValidationIssue {
  file: string;
  field: string;
  message: string;
}

export interface TopicSection {
  heading: string;
  markdown: string;
}

export interface TopicSource extends TopicFrontmatter {
  id: string;
  file: string;
  sections: TopicSection[];
}

export interface FormulaSource extends FormulaData {
  file: string;
}

export interface DistributionSource extends DistributionData {
  id: string;
  file: string;
}

export interface ProblemSource extends ProblemData {
  id: string;
  file: string;
}

export interface LoadedContent {
  categories: Category[];
  topics: TopicSource[];
  formulas: FormulaSource[];
  distributions: DistributionSource[];
  problems: ProblemSource[];
}

export type { Category };
