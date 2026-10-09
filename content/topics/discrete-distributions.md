---
title: 離散分布
category: probability
order: 3
summary: ベルヌーイ・二項・ポアソン・幾何・負の二項・超幾何分布の性質と相互関係
distributions: [bernoulli, binomial, poisson, geometric, negative-binomial, hypergeometric, multinomial]
---

## 定義

離散型確率変数 $X$ の分布は確率関数 $p(x)=P(X=x)$ で表され、$\sum_x p(x)=1$ を満たす。準1級で頻出の離散分布は次のとおり。

| 分布 | 状況 | 期待値 | 分散 |
| --- | --- | --- | --- |
| ベルヌーイ $\mathrm{Bin}(1,p)$ | 1回の成功・失敗 | $p$ | $p(1-p)$ |
| 二項 $B(n,p)$ | $n$ 回の独立試行の成功回数 | $np$ | $np(1-p)$ |
| ポアソン $\mathrm{Po}(\lambda)$ | まれな事象の発生回数 | $\lambda$ | $\lambda$ |
| 幾何 $\mathrm{Geo}(p)$ | 初めて成功するまでの失敗回数 | $(1-p)/p$ | $(1-p)/p^2$ |
| 負の二項 $\mathrm{NB}(r,p)$ | $r$ 回成功するまでの失敗回数 | $r(1-p)/p$ | $r(1-p)/p^2$ |
| 超幾何 $\mathrm{HG}(N,K,n)$ | 非復元抽出での当たりの数 | $nK/N$ | $n\frac{K}{N}\left(1-\frac{K}{N}\right)\frac{N-n}{N-1}$ |

積率母関数 $M_X(t)=E[e^{tX}]$ が $t=0$ の近傍で存在すれば、$E[X^r]=M_X^{(r)}(0)$ であり、積率母関数は分布を一意に定める。

## 導出の流れ

- **二項分布の期待値・分散**：$X=\sum_{i=1}^n Y_i$（$Y_i$ は独立なベルヌーイ）と分解すると、$E[X]=\sum E[Y_i]=np$、$V[X]=\sum V[Y_i]=np(1-p)$。和に分解するのが最短経路。
- **ポアソン分布の積率**：$M(t)=\sum_k e^{tk}e^{-\lambda}\lambda^k/k!=\exp\{\lambda(e^t-1)\}$。対数をとった $K(t)=\lambda(e^t-1)$（キュムラント母関数）を微分すると $K'(0)=\lambda$（平均）、$K''(0)=\lambda$（分散）。
- **ポアソン近似**：$np=\lambda$ を固定して $n\to\infty$ とすると $\binom nk p^k(1-p)^{n-k}\to e^{-\lambda}\lambda^k/k!$。
- **再生性と条件付き分布**：独立な $X\sim\mathrm{Po}(\lambda_1)$、$Y\sim\mathrm{Po}(\lambda_2)$ について $X+Y\sim\mathrm{Po}(\lambda_1+\lambda_2)$。さらに $X\mid X+Y=n\sim B\!\left(n,\frac{\lambda_1}{\lambda_1+\lambda_2}\right)$。
- **幾何分布の無記憶性**：$P(X\ge s+t\mid X\ge s)=(1-p)^{t}=P(X\ge t)$。

## 落とし穴

- **幾何分布・負の二項分布の定義の違い**：「失敗回数」（0 始まり）か「試行回数」（1 始まり）かで期待値が $1$ ずれる（$\frac{1-p}{p}$ と $\frac1p$）。問題文の定義を必ず確認する。
- **超幾何分布の分散**：復元抽出（二項分布）と比べて有限母集団修正 $\frac{N-n}{N-1}$ がかかる。$n=N$ なら分散は $0$。
- **ポアソン分布の過分散**：実データで分散が平均より大きいときはポアソン分布が不適切で、負の二項分布などを検討する。
- **積率母関数が存在しない分布もある**（t 分布・コーシー分布・対数正規分布など）。存在しないときは特性関数を使う。
