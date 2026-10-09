/** ビルド時に出力され、ブラウザが読み込む問題データの形式 */

export type ProblemType = 'choice' | 'numeric';
export type Difficulty = 1 | 2 | 3;

export interface Tolerance {
  type: 'absolute' | 'relative';
  value: number;
}

export interface ProblemVariant {
  values: Record<string, string>;
  answer: number | null;
}

export interface LinkRef {
  id: string;
  title: string;
  href: string;
}

export interface Problem {
  id: string;
  topics: string[];
  category: string;
  formulas: string[];
  difficulty: Difficulty;
  type: ProblemType;
  statementHtml: string;
  explanationHtml: string;
  choices: { id: string; html: string; correct: boolean }[] | null;
  shuffleChoices: boolean;
  /** 正答の表示桁数（未指定なら null） */
  digits: number | null;
  tolerance: Tolerance | null;
  /** 1件以上。パラメータを持たない問題は固定インスタンス1件 */
  variants: ProblemVariant[];
  sourceLabel: string;
  topicLinks: LinkRef[];
  formulaLinks: LinkRef[];
}

export interface ProblemBankFile {
  contentVersion: string;
  topicId: string;
  problems: Problem[];
}

export interface ProblemIndexEntry {
  id: string;
  topics: string[];
  category: string;
  type: ProblemType;
  difficulty: Difficulty;
  /** この問題を収録している問題バンク（主分野ID） */
  bank: string;
  variantCount: number;
}

export interface ProblemIndexFile {
  contentVersion: string;
  problems: ProblemIndexEntry[];
}
