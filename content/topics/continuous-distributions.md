---
title: 連続分布
category: probability
order: 4
summary: 正規・指数・ガンマ・ベータ分布と標本分布（χ²・t・F）
distributions: [normal, exponential, gamma, beta, chisq, t, f]
---

## 定義

- **正規分布** $N(\mu,\sigma^2)$（[[dist:normal]]）：$f(x)=\frac{1}{\sqrt{2\pi}\sigma}\exp\left\{-\frac{(x-\mu)^2}{2\sigma^2}\right\}$。$Z=(X-\mu)/\sigma\sim N(0,1)$ と標準化して確率を求める（[[formula:contdist-normal-standardize]]）。独立な正規変数の線形結合も正規分布に従う。
- **指数分布** $\mathrm{Ex}(\lambda)$（[[dist:exponential]]）：$f(x)=\lambda e^{-\lambda x}\ (x\ge0)$、$E[X]=1/\lambda$、$V[X]=1/\lambda^2$、$P(X>x)=e^{-\lambda x}$。
- **ガンマ分布** $\mathrm{Ga}(\alpha,\lambda)$（[[dist:gamma]]）：$f(x)=\frac{\lambda^\alpha}{\Gamma(\alpha)}x^{\alpha-1}e^{-\lambda x}$、$E[X]=\alpha/\lambda$、$V[X]=\alpha/\lambda^2$。$\alpha=1$ が指数分布。
- **ベータ分布** $\mathrm{Be}(a,b)$（[[dist:beta]]）：$f(x)=\frac{x^{a-1}(1-x)^{b-1}}{B(a,b)}\ (0<x<1)$、$E[X]=\frac{a}{a+b}$。
- **標本分布**：$Z_1,\dots,Z_k\overset{\text{i.i.d.}}{\sim}N(0,1)$ に対し
  - $\sum_{i=1}^k Z_i^2\sim\chi^2_k$（[[dist:chisq]]、平均 $k$、分散 $2k$）
  - $Z\sim N(0,1)$ と $W\sim\chi^2_k$ が独立なら $T=Z/\sqrt{W/k}\sim t_k$（[[dist:t]]）
  - $W_1\sim\chi^2_m$、$W_2\sim\chi^2_n$ が独立なら $F=\frac{W_1/m}{W_2/n}\sim F(m,n)$（[[dist:f]]）

## 導出の流れ

1. **無記憶性**：$P(X>s+t\mid X>s)=\frac{e^{-\lambda(s+t)}}{e^{-\lambda s}}=e^{-\lambda t}=P(X>t)$。連続分布で無記憶性をもつのは指数分布だけ（離散では幾何分布）（[[formula:contdist-exponential-memoryless]]）。
2. **指数分布の和**：$X_1,\dots,X_n\overset{\text{i.i.d.}}{\sim}\mathrm{Ex}(\lambda)$ の和は積率母関数 $\left(\frac{\lambda}{\lambda-t}\right)^n$ から $\mathrm{Ga}(n,\lambda)$。ポアソン過程の $n$ 番目の事象の時刻 $T_n$ がこれに従い、$P(T_n\le t)=P(\text{時刻 } t \text{ までに } n \text{ 回以上})=1-\sum_{k=0}^{n-1}e^{-\lambda t}\frac{(\lambda t)^k}{k!}$（[[formula:contdist-gamma-sum]]）。
3. **カイ二乗分布との関係**：$\chi^2_k=\mathrm{Ga}(k/2,\,1/2)$。$Z^2\sim\chi^2_1$。
4. **正規標本の性質**：$X_1,\dots,X_n\overset{\text{i.i.d.}}{\sim}N(\mu,\sigma^2)$ なら $\bar X$ と $S^2$ は独立で
   $$
   \bar X\sim N(\mu,\sigma^2/n),\qquad \frac{(n-1)S^2}{\sigma^2}\sim\chi^2_{n-1}
   $$
   よって $\frac{\bar X-\mu}{S/\sqrt n}\sim t_{n-1}$（[[formula:contdist-chisq-sample-variance]]、[[formula:contdist-t-construction]]）。
5. **2標本の分散比**：独立な正規標本の不偏分散について $\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2}\sim F(n_1-1,n_2-1)$。また $T\sim t_k$ なら $T^2\sim F(1,k)$、$F\sim F(m,n)$ なら $1/F\sim F(n,m)$（[[formula:contdist-f-construction]]）。

## 落とし穴

- **パラメータの表記**：指数分布・ガンマ分布は「率 $\lambda$」と「尺度 $\theta=1/\lambda$」の2通りの書き方がある。平均が $1/\lambda$ か $\theta$ かを必ず確認する。
- **$t$ 分布の自由度**：$\sigma$ を $S$ で置き換えると自由度は $n-1$。$k\to\infty$ で $t_k\to N(0,1)$。$t_1$ はコーシー分布で平均が存在しない（[[dist:cauchy]]）。
- **$F$ 分布の下側点**：$F_{1-\alpha}(m,n)=1/F_{\alpha}(n,m)$（上側 $100\alpha\%$ 点を $F_\alpha$ と書いた場合）。分子と分母の自由度を入れ替える。
- $(n-1)S^2/\sigma^2\sim\chi^2_{n-1}$ は **母集団が正規分布のとき** の結果。正規でない母集団では成り立たない（平均の $t$ 検定よりも非正規性に敏感）。
- ベータ分布の分散は $\frac{ab}{(a+b)^2(a+b+1)}$。$a=b=1$ は一様分布 $U(0,1)$（[[dist:uniform]]）。
