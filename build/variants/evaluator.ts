import type { FactoryFunctionMap } from 'mathjs';
import mathjs from 'mathjs/lib/browser/math.js';
import { STAT_FUNCTIONS } from '../../src/lib/stats/functions';

export type Scope = Record<string, number>;
export type EvalResult = number | boolean;

export interface Evaluator {
  evaluate(expr: string | number, scope: Readonly<Scope>): EvalResult;
}

/**
 * 類題生成専用の式評価器（ビルド時のみ使用し、ブラウザへは送らない）。
 * 数学関数と統計関数のみ利用でき、式の再評価・関数定義の取り込みなどは無効化する。
 */
export function createEvaluator(): Evaluator {
  // 単一ファイル版は `all` を公開していないが、create() は関数一覧を省略すると全関数を含むインスタンスを作る
  const math = mathjs.create(mathjs.all as FactoryFunctionMap, { number: 'number' });
  const limitedEvaluate = math.evaluate.bind(math);

  const disabled = (name: string) => () => {
    throw new Error(`関数 ${name} は使用できません`);
  };
  // 統計関数の取り込みは、import 自体を無効化する前に行う
  math.import({ ...STAT_FUNCTIONS }, { override: true });
  math.import(
    {
      import: disabled('import'),
      createUnit: disabled('createUnit'),
      evaluate: disabled('evaluate'),
      parse: disabled('parse'),
      simplify: disabled('simplify'),
      derivative: disabled('derivative'),
      resolve: disabled('resolve'),
      compile: disabled('compile'),
    },
    { override: true },
  );

  return {
    evaluate(expr, scope) {
      if (typeof expr === 'number') return expr;
      const result: unknown = limitedEvaluate(expr, { ...scope });
      if (typeof result === 'number' || typeof result === 'boolean') return result;
      throw new Error(`式 "${expr}" の結果が数値・真偽値ではありません`);
    },
  };
}
