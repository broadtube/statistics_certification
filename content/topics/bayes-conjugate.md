---
title: ベイズ推定と共役事前分布
category: bayes
order: 1
summary: ベイズの定理による事後分布、共役事前分布（ベータ・二項、ガンマ・ポアソン、正規・正規）、ベイズ推定量と損失関数、予測分布
distributions: [beta, gamma, normal]
---

## 定義

母数 $\theta$ を確率変数とみなし、**事前分布** $\pi(\theta)$ とデータの尤度 $f(x\mid\theta)$ から **事後分布** を求める。
$$
\pi(\theta\mid x)=\frac{f(x\mid\theta)\pi(\theta)}{\int f(x\mid\theta')\pi(\theta')\,d\theta'}\ \propto\ f(x\mid\theta)\,\pi(\theta)
$$

- **共役事前分布**：事前分布と事後分布が同じ分布族に属するような事前分布。
- **ベイズ推定量**：事後期待損失を最小にする推定量。二乗損失なら事後平均、絶対損失なら事後中央値、0-1損失の極限なら事後モード（MAP 推定量）。
- **予測分布**：$f(\tilde x\mid x)=\int f(\tilde x\mid\theta)\pi(\theta\mid x)\,d\theta$。

## 導出の流れ

1. **ベータ・二項**：事前 $\mathrm{Be}(\alpha,\beta)$、$n$ 回中 $x$ 回成功を観測すると
   $\pi(p\mid x)\propto p^x(1-p)^{n-x}\cdot p^{\alpha-1}(1-p)^{\beta-1}$ より事後は $\mathrm{Be}(\alpha+x,\ \beta+n-x)$。事後平均 $\frac{\alpha+x}{\alpha+\beta+n}$。
2. **ガンマ・ポアソン**：事前 $\mathrm{Ga}(\alpha,\lambda_0)$（比率 $\lambda_0$）、観測 $x_1,\dots,x_n\sim\mathrm{Po}(\theta)$ なら事後は $\mathrm{Ga}\left(\alpha+\sum x_i,\ \lambda_0+n\right)$。事後平均 $\frac{\alpha+\sum x_i}{\lambda_0+n}$。
3. **正規・正規**（$\sigma^2$ 既知）：事前 $N(\mu_0,\tau_0^2)$、標本平均 $\bar x$ なら事後は正規分布で、精度（分散の逆数）が足し算になる。
   $$
   \frac{1}{\tau_n^2}=\frac{1}{\tau_0^2}+\frac{n}{\sigma^2},\qquad \mu_n=\tau_n^2\left(\frac{\mu_0}{\tau_0^2}+\frac{n\bar x}{\sigma^2}\right)
   $$
   事後平均は事前平均と標本平均の、精度を重みとする加重平均。
4. **事後平均の分解**：ベータ・二項では $\frac{\alpha+x}{\alpha+\beta+n}=w\frac{\alpha}{\alpha+\beta}+(1-w)\frac xn$、$w=\frac{\alpha+\beta}{\alpha+\beta+n}$。$n\to\infty$ で最尤推定値 $x/n$ に近づく。
5. **予測確率**（ベータ・二項）：次の1回が成功する確率は事後平均 $\frac{\alpha+x}{\alpha+\beta+n}$ に等しい。

## 落とし穴

- **ガンマ分布の母数の流儀**：比率（rate）$\lambda_0$ か尺度（scale）$\theta=1/\lambda_0$ かで更新式の見た目が変わる。
- **信用区間と信頼区間**：ベイズの95%信用区間は「$\theta$ がこの区間に入る事後確率が0.95」と解釈できるが、頻度論の信頼区間はそう解釈できない。
- **無情報事前分布**：一様分布 $\mathrm{Be}(1,1)$ やジェフリーズ事前分布 $\mathrm{Be}(1/2,1/2)$ など。積分が発散する（非正則な）事前分布でも事後分布が正則になる場合がある。
- 事後分布の計算では正規化定数を後回しにし、$\theta$ を含む部分（カーネル）だけを比べて分布族を特定するのが定石。
