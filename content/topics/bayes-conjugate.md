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
- **信用区間**：事後確率 $1-\alpha$ で $\theta$ を含む区間。事後分布の上下 $\alpha/2$ 点で挟む **等裾信用区間** と、事後密度が一定値以上の範囲をとる **HPD 区間**（最高事後密度区間）がある。
- **ベイズファクター**：2つの仮説（モデル）$H_0,H_1$ の周辺尤度 $p(x\mid H_k)=\int f(x\mid\theta)\pi_k(\theta)\,d\theta$ の比 $B_{01}=\frac{p(x\mid H_0)}{p(x\mid H_1)}$。データが $H_0$ をどれだけ支持するかを表す。

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
   次の2回とも成功する確率は $E[p^2\mid x]=\frac{\alpha'(\alpha'+1)}{(\alpha'+\beta')(\alpha'+\beta'+1)}$（$\alpha'=\alpha+x$、$\beta'=\beta+n-x$）で、事後平均の2乗より大きい。
6. **予測分布**（ガンマ・ポアソン）：事後 $\mathrm{Ga}(\alpha',\lambda')$ でポアソン分布を混合すると、成功確率 $\frac{\lambda'}{\lambda'+1}$、形状 $\alpha'$ の **負の二項分布** になる。特に $P(\tilde x=0\mid\boldsymbol x)=\left(\frac{\lambda'}{\lambda'+1}\right)^{\alpha'}$。
7. **予測分布**（正規・正規）：$\tilde x=\theta+\varepsilon$ で $\theta\mid\boldsymbol x\sim N(\mu_n,\tau_n^2)$ と $\varepsilon\sim N(0,\sigma^2)$ が独立なので $\tilde x\mid\boldsymbol x\sim N(\mu_n,\ \sigma^2+\tau_n^2)$。
8. **ベイズファクター**：ベイズの定理を2つの仮説について書いて比をとると、正規化定数が消えて
   $$
   \frac{P(H_0\mid x)}{P(H_1\mid x)}=\frac{p(x\mid H_0)}{p(x\mid H_1)}\cdot\frac{P(H_0)}{P(H_1)}
   $$
   （事後オッズ＝ベイズファクター×事前オッズ）。両仮説が単純仮説 $\theta=\theta_0,\theta_1$ なら、周辺尤度は尤度そのものなので $B_{01}$ は尤度比 $f(x\mid\theta_0)/f(x\mid\theta_1)$ に一致する。$B_{10}$ が 3〜10 なら $H_1$ を支持する相当の根拠、10 を超えると強い根拠とするのが目安（ジェフリーズ）。

## 落とし穴

- **ガンマ分布の母数の流儀**：比率（rate）$\lambda_0$ か尺度（scale）$\theta=1/\lambda_0$ かで更新式の見た目が変わる。
- **信用区間と信頼区間**：ベイズの95%信用区間は「$\theta$ がこの区間に入る事後確率が0.95」と解釈できるが、頻度論の信頼区間はそう解釈できない。
- **無情報事前分布**：一様分布 $\mathrm{Be}(1,1)$ やジェフリーズ事前分布 $\mathrm{Be}(1/2,1/2)$ など。積分が発散する（非正則な）事前分布でも事後分布が正則になる場合がある。
- **予測分布の分散は観測モデルの分散より大きい**。母数を事後平均に固定した分布（プラグイン）で代用すると、予測の不確かさを過小評価する。
- **等裾区間と HPD 区間**：事後分布が非対称なら一致しない。HPD 区間は同じ事後確率の区間の中で最も短く、最頻値側に寄る。
- **ベイズファクターは事後確率ではない**。事前オッズを掛けて初めて事後オッズになる。複合仮説では仮説内の事前分布に依存し、非正則な事前分布は使えない（定数倍が定まらない）。
- 事後分布の計算では正規化定数を後回しにし、$\theta$ を含む部分（カーネル）だけを比べて分布族を特定するのが定石。
