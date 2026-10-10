---
title: 一般化線形モデル
category: regression
order: 5
summary: ロジスティック回帰、ポアソン回帰、リンク関数、逸脱度
distributions: [binomial, poisson, chisq]
---

## 定義

- **一般化線形モデル（GLM）** は次の3要素からなる。
  1. **確率分布**：目的変数 $Y_i$ が指数型分布族（正規・二項・ポアソン・ガンマなど）に従う。
  2. **線形予測子**：$\eta_i=\boldsymbol x_i^\top\boldsymbol\beta=\beta_0+\beta_1x_{i1}+\dots+\beta_px_{ip}$。
  3. **リンク関数**：平均 $\mu_i=E[Y_i]$ と線形予測子を $g(\mu_i)=\eta_i$ で結ぶ単調な関数。
- **正準リンク**：正規分布なら恒等リンク $g(\mu)=\mu$（通常の線形回帰）、二項分布ならロジット $g(\mu)=\log\frac{\mu}{1-\mu}$、ポアソン分布なら対数 $g(\mu)=\log\mu$。
- **ロジスティック回帰**：$Y_i\sim\mathrm{Bin}(1,\pi_i)$、$\log\dfrac{\pi_i}{1-\pi_i}=\boldsymbol x_i^\top\boldsymbol\beta$。すなわち $\pi_i=\dfrac{1}{1+\exp(-\boldsymbol x_i^\top\boldsymbol\beta)}$。
- **ポアソン回帰**：$Y_i\sim\mathrm{Po}(\mu_i)$、$\log\mu_i=\boldsymbol x_i^\top\boldsymbol\beta$。観測期間や人数などの **オフセット** $\log t_i$ を加えて $\log\mu_i=\log t_i+\boldsymbol x_i^\top\boldsymbol\beta$ とすると、率 $\mu_i/t_i$ のモデルになる。
- **逸脱度（デビアンス）**：飽和モデル（観測値に完全に当てはまるモデル）の最大対数尤度 $\ell_{\text{sat}}$ との差の2倍
  $$
  D=2\{\ell_{\text{sat}}-\ell(\hat{\boldsymbol\beta})\}
  $$
  正規線形モデルでは $D=\mathrm{RSS}/\sigma^2$ にあたり、残差平方和の一般化になっている。

## 導出の流れ

1. **係数の解釈（ロジスティック）**：$x_j$ が1増えるとロジット（対数オッズ）が $\beta_j$ 増える。よってオッズは $e^{\beta_j}$ 倍になる（**オッズ比** $e^{\beta_j}$、[[formula:odds-ratio]]）。
2. **係数の解釈（ポアソン）**：$x_j$ が1増えると $\log\mu$ が $\beta_j$ 増えるので、平均（率）は $e^{\beta_j}$ 倍になる（**率比**）。
3. **推定**：最尤法で推定する。正準リンクでは尤度方程式が $X^\top(\boldsymbol y-\boldsymbol\mu)=\boldsymbol 0$ という形になる。解は陽に書けないので、ニュートン・ラフソン法（フィッシャーのスコア法）で反復計算する。これは重み付き最小二乗の繰り返し（IRLS）と同じ。
4. **ワルド検定**：$\hat\beta_j$ は漸近的に正規分布に従うので（[[formula:mle-asymptotic-normality]]）、$z=\hat\beta_j/\mathrm{SE}(\hat\beta_j)$ を標準正規分布で評価する。$\beta_j$ の95%信頼区間 $\hat\beta_j\pm1.96\,\mathrm{SE}$ を指数変換すると、オッズ比・率比の信頼区間になる。
5. **尤度比検定（逸脱度の差）**：モデル M$_0$ が M$_1$ に入れ子で、パラメータ数の差が $q$ のとき、$D_0-D_1=2\{\ell_1-\ell_0\}$ は $H_0$ のもと漸近的に $\chi^2_q$ に従う（[[topic:likelihood-ratio]]）。
6. **適合度**：二項（集計データ）やポアソン回帰では、逸脱度やピアソンの $\chi^2=\sum(y_i-\hat\mu_i)^2/V(\hat\mu_i)$ を自由度 $n-(p+1)$ の $\chi^2$ 分布と比べる。

## 落とし穴

- ロジスティック回帰の係数 $\beta_j$ は確率の差ではなく **対数オッズ比**。確率 $\pi$ の変化量は $x$ の値によって変わる（$\partial\pi/\partial x_j=\beta_j\pi(1-\pi)$）。
- ポアソン分布は平均と分散が等しい。データの分散が平均より大きい **過分散** があると標準誤差が過小になり、有意になりやすい。準ポアソンモデルや負の二項回帰で対処する。
- 0/1 データ（個票）の逸脱度は適合度の検定には使えない（$\chi^2$ 近似が成り立たない）。逸脱度の **差** による入れ子モデルの比較には使える。
- 説明変数の組合せで目的変数が完全に分かれる（**完全分離**）と、ロジスティック回帰の最尤推定値は存在せず、係数が発散する。
- 期間の異なる件数データでは、オフセット $\log t_i$ を入れ忘れると率ではなく件数をモデル化してしまう。
