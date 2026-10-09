/**
 * R 風の名前を持つ分布関数・特殊関数。
 * ビルド時の類題生成（式評価）と、ブラウザ側の計算機の双方から利用する。
 */
import {
  betafn,
  binomcoef,
  binomial_cdf as binomCdf,
  binomial_pmf as binomPmf,
  chisquare_cdf as chisqCdf,
  chisquare_quantile as chisqQuantile,
  f_cdf as fCdf,
  f_quantile as fQuantile,
  gammafn,
  normal_cdf as normalCdf,
  normal_quantile as normalQuantile,
  poisson_cdf as poisCdf,
  poisson_pmf as poisPmf,
  t_cdf as tCdf,
  t_quantile as tQuantile,
} from '../../vendor/stdlib.js';

export const STAT_FUNCTIONS = {
  pnorm: (x: number, mu = 0, sd = 1): number => normalCdf(x, mu, sd),
  qnorm: (p: number, mu = 0, sd = 1): number => normalQuantile(p, mu, sd),
  pt: (x: number, df: number): number => tCdf(x, df),
  qt: (p: number, df: number): number => tQuantile(p, df),
  pchisq: (x: number, df: number): number => chisqCdf(x, df),
  qchisq: (p: number, df: number): number => chisqQuantile(p, df),
  pf: (x: number, d1: number, d2: number): number => fCdf(x, d1, d2),
  qf: (p: number, d1: number, d2: number): number => fQuantile(p, d1, d2),
  dbinom: (k: number, n: number, p: number): number => binomPmf(k, n, p),
  pbinom: (k: number, n: number, p: number): number => binomCdf(k, n, p),
  dpois: (k: number, lambda: number): number => poisPmf(k, lambda),
  ppois: (k: number, lambda: number): number => poisCdf(k, lambda),
  choose: (n: number, k: number): number => binomcoef(n, k),
  gammafn: (x: number): number => gammafn(x),
  betafn: (a: number, b: number): number => betafn(a, b),
} as const;

export type StatFunctionName = keyof typeof STAT_FUNCTIONS;
