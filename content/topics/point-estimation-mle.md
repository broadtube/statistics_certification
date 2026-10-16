---
title: 点推定と最尤法
category: inference
order: 1
summary: 不偏性・平均二乗誤差、最尤推定量、フィッシャー情報量とクラメール・ラオの下限、最尤推定量の漸近正規性
---

## 定義

- **推定量** $T=T(X_1,\dots,X_n)$ は標本の関数。母数 $\theta$ に対し $E[T]=\theta$ のとき **不偏推定量** という。
- **平均二乗誤差**：$\mathrm{MSE}(T)=E[(T-\theta)^2]=V[T]+\{E[T]-\theta\}^2$（分散＋バイアスの二乗）。
- **尤度関数** $L(\theta)=\prod_{i=1}^n f(x_i;\theta)$、対数尤度 $\ell(\theta)=\sum_{i=1}^n\log f(x_i;\theta)$。$\ell(\theta)$ を最大にする $\hat\theta$ が **最尤推定量（MLE）**。
- **フィッシャー情報量**（1観測あたり）：
  $$
  I(\theta)=E\left[\left(\frac{\partial}{\partial\theta}\log f(X;\theta)\right)^2\right]=-E\left[\frac{\partial^2}{\partial\theta^2}\log f(X;\theta)\right]
  $$
- **一致性**：$n\to\infty$ で $T\xrightarrow{p}\theta$。
- **積率法（モーメント法）**：母集団の積率 $E[X^k]$ を母数で表し、標本積率 $\frac1n\sum X_i^k$ と等しいとおいて母数について解く（[[formula:method-of-moments]]）。
- **十分統計量**：$T$ を与えたときの標本の条件付き分布が $\theta$ によらないとき、$T$ は $\theta$ の十分統計量（$\theta$ についての情報をすべて含む）。同時密度が $g(T(\boldsymbol x);\theta)h(\boldsymbol x)$ と分解できることと同値（因子分解定理、[[formula:sufficiency-factorization]]）。

## 導出の流れ

1. 対数尤度 $\ell(\theta)$ を書く（積を和にするため対数をとる）。
2. スコア方程式 $\ell'(\theta)=0$ を解く。2階微分が負であること（または境界）を確認する。
3. 例：指数分布 $f(x;\lambda)=\lambda e^{-\lambda x}$ では $\ell(\lambda)=n\log\lambda-\lambda\sum x_i$、$\ell'(\lambda)=n/\lambda-\sum x_i=0$ より $\hat\lambda=1/\bar x$。
4. 例：正規分布 $N(\mu,\sigma^2)$ では $\hat\mu=\bar x$、$\hat\sigma^2=\frac1n\sum(x_i-\bar x)^2$（不偏ではない）。
5. **クラメール・ラオの不等式**：正則条件のもとで、不偏推定量 $T$ について $V[T]\ge\frac{1}{nI(\theta)}$。等号を達成する推定量を **有効推定量** という。
6. **漸近正規性**：正則条件のもとで $\sqrt n(\hat\theta-\theta)\xrightarrow{d}N\left(0,\ I(\theta)^{-1}\right)$。これから $\hat\theta\pm1.96/\sqrt{nI(\hat\theta)}$ という近似的な95%信頼区間（ワルド型）が得られる。
7. **不変性**：$g(\theta)$ の最尤推定量は $g(\hat\theta)$。
8. **積率法の例**：ガンマ分布 $\mathrm{Ga}(\alpha,\lambda)$ では $\alpha/\lambda=\bar x$、$\alpha/\lambda^2=\hat s^2$（$n$ で割った標本分散）を解いて $\tilde\alpha=\bar x^2/\hat s^2$、$\tilde\lambda=\bar x/\hat s^2$。最尤推定量は陽に解けないが、積率推定量は簡単に求まる。
9. **ラオ＝ブラックウェルの定理**：不偏推定量 $T$ を十分統計量 $S$ で条件付けた $E[T\mid S]$ も不偏で、分散は $V[T]$ 以下（全分散の公式から従う、[[formula:rao-blackwell]]）。例：ポアソン分布で $\mathbf 1\{X_1=0\}$ を $S=\sum X_i$ で条件付けると $(1-1/n)^S$。さらに $S$ が **完備** なら、こうして得た推定量は一様最小分散不偏推定量（UMVUE）になる（レーマン・シェフェの定理）。

## 落とし穴

- **最尤推定量は不偏とは限らない**：$\hat\sigma^2=\frac1n\sum(x_i-\bar x)^2$ の期待値は $\frac{n-1}{n}\sigma^2$。不偏分散は $n-1$ で割る。
- **不変性は不偏性を保たない**：$\hat\lambda=1/\bar X$ は $\lambda$ の不偏推定量ではない（$E[1/\bar X]=\frac{n}{n-1}\lambda$）。
- **台が母数に依存する分布**（一様分布 $U(0,\theta)$ など）は正則条件を満たさない。$\hat\theta=\max X_i$ はスコア方程式からは求まらず、クラメール・ラオの下限も適用できない。
- フィッシャー情報量は **1観測あたり** か **標本全体** か（$nI(\theta)$）を区別する。
- **積率推定量は母数空間と矛盾することがある**：$U(0,\theta)$ の $\tilde\theta=2\bar X$ は観測値の最大値より小さくなりうる。また一般に最尤推定量より効率が悪い。
- **十分統計量の関数がすべて十分とは限らない**：1対1の関数（$\sum X_i$ と $\bar X$）なら十分だが、情報を失う関数はそうではない。$U(0,\theta)$ の十分統計量は $\bar X$ ではなく $\max X_i$。
