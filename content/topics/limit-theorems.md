---
title: 極限定理
category: probability
order: 6
summary: 大数の法則、中心極限定理、デルタ法、各種の収束
---

## 定義

確率変数列 $X_1,X_2,\dots$ と確率変数 $X$（定数でもよい）について：

- **確率収束** $X_n\xrightarrow{p}X$：任意の $\varepsilon>0$ で $P(|X_n-X|>\varepsilon)\to0$。
- **概収束** $X_n\xrightarrow{\text{a.s.}}X$：$P\left(\lim_{n\to\infty}X_n=X\right)=1$。
- **分布収束** $X_n\xrightarrow{d}X$：$X$ の分布関数 $F$ の連続点 $x$ で $P(X_n\le x)\to F(x)$。
- **平均二乗収束**：$E[(X_n-X)^2]\to0$。
- 関係：概収束 $\Rightarrow$ 確率収束 $\Rightarrow$ 分布収束。平均二乗収束 $\Rightarrow$ 確率収束。**定数への** 分布収束は確率収束と同値（[[formula:lt-convergence-relations]]）。

## 導出の流れ

1. **チェビシェフの不等式**：$P(|X-\mu|\ge k\sigma)\le\frac1{k^2}$。マルコフの不等式 $P(Y\ge a)\le E[Y]/a$ を $Y=(X-\mu)^2$ に適用する（[[formula:lt-chebyshev-inequality]]）。
2. **大数の弱法則**：$X_i$ が i.i.d. で平均 $\mu$・分散 $\sigma^2$ なら、チェビシェフの不等式より
   $P(|\bar X_n-\mu|\ge\varepsilon)\le\frac{\sigma^2}{n\varepsilon^2}\to0$。よって $\bar X_n\xrightarrow{p}\mu$（平均が存在すれば分散がなくても成り立つ。強法則では概収束）（[[formula:lt-weak-law]]）。
3. **中心極限定理**：$X_i$ が i.i.d. で平均 $\mu$・分散 $\sigma^2<\infty$ なら
   $$
   \frac{\sqrt n(\bar X_n-\mu)}{\sigma}\xrightarrow{d}N(0,1)
   $$
   積率母関数（特性関数）を $t/\sqrt n$ のまわりでテイラー展開し、$\left(1+\frac{t^2}{2n}+o(1/n)\right)^n\to e^{t^2/2}$ を示す（[[formula:lt-central-limit-theorem]]）。
4. **二項分布の正規近似**：$X\sim B(n,p)$ は独立なベルヌーイ変数の和なので $X\approx N(np,np(1-p))$。整数値なので **連続修正** $P(X\le k)\approx\Phi\left(\frac{k+0.5-np}{\sqrt{np(1-p)}}\right)$ を使う。
5. **スラツキーの定理**：$X_n\xrightarrow{d}X$、$Y_n\xrightarrow{p}c$ なら $X_n+Y_n\xrightarrow{d}X+c$、$X_nY_n\xrightarrow{d}cX$。$\sigma$ を一致推定量 $S$ に置き換えても $\sqrt n(\bar X-\mu)/S\xrightarrow{d}N(0,1)$（[[formula:lt-slutsky]]）。
6. **デルタ法**：$\sqrt n(T_n-\theta)\xrightarrow{d}N(0,\sigma^2)$ で $g'(\theta)\ne0$ なら
   $$
   \sqrt n\big(g(T_n)-g(\theta)\big)\xrightarrow{d}N\big(0,\ \{g'(\theta)\}^2\sigma^2\big)
   $$
   $g(T_n)\approx g(\theta)+g'(\theta)(T_n-\theta)$ という1次近似による（[[formula:lt-delta-method]]）。例：$\hat p$ の対数オッズの漸近分散は $\frac{1}{np(1-p)}$。最尤推定量の漸近正規性は [[topic:point-estimation-mle]]。

## 落とし穴

- **中心極限定理は分散の存在が必要**：[[dist:cauchy]] では $\bar X_n$ は $n$ によらず同じコーシー分布に従い、大数の法則も成り立たない。
- 中心極限定理は **標準化した平均** の分布の主張で、$X_i$ 自体や $\bar X_n$ がどんな $n$ でも正規分布になるわけではない。歪んだ分布では近似に大きな $n$ が必要。
- **確率収束は概収束より弱い**、分布収束は一般に確率収束を意味しない（例：$X\sim N(0,1)$ で $X_n=-X$ は $X$ に分布収束するが確率収束しない）。
- デルタ法は $g'(\theta)=0$ の点では1次の項が消えるため、そのままでは使えない（2次の展開が必要）。
- チェビシェフの不等式は分布によらず成り立つ代わりに粗い。$k=2$ でも上界は $0.25$（正規分布なら約 $0.0455$）。
