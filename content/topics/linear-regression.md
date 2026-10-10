---
title: 線形回帰
category: regression
order: 1
summary: 最小二乗推定量、推定量の分散、決定係数・自由度調整済み決定係数、係数の t 検定とモデル全体の F 検定
---

## 定義

重回帰モデル（説明変数 $p$ 個＋切片）
$$
y_i=\beta_0+\beta_1x_{i1}+\cdots+\beta_px_{ip}+\varepsilon_i,\qquad \varepsilon_i\overset{\text{i.i.d.}}{\sim}N(0,\sigma^2)
$$
を行列で $\boldsymbol y=X\boldsymbol\beta+\boldsymbol\varepsilon$ と書く（$X$ は $n\times(p+1)$ の計画行列）。

- **最小二乗推定量**：残差平方和 $\mathrm{RSS}=\|\boldsymbol y-X\boldsymbol\beta\|^2$ を最小にする $\hat{\boldsymbol\beta}=(X^\top X)^{-1}X^\top\boldsymbol y$。
- **平方和の分解**：$\mathrm{TSS}=\sum(y_i-\bar y)^2=\mathrm{ESS}+\mathrm{RSS}$（全平方和＝回帰平方和＋残差平方和）。切片を含むモデルで成り立つ。
- **決定係数**：$R^2=1-\mathrm{RSS}/\mathrm{TSS}$。単回帰では $R^2=r_{xy}^2$（相関係数の二乗）。

## 導出の流れ

1. **単回帰**：$\frac{\partial\mathrm{RSS}}{\partial\beta_0}=\frac{\partial\mathrm{RSS}}{\partial\beta_1}=0$（正規方程式）を解くと
   $\hat\beta_1=\frac{S_{xy}}{S_{xx}}$、$\hat\beta_0=\bar y-\hat\beta_1\bar x$（$S_{xy}=\sum(x_i-\bar x)(y_i-\bar y)$、$S_{xx}=\sum(x_i-\bar x)^2$）。
2. **行列形**：$X^\top X\boldsymbol\beta=X^\top\boldsymbol y$ から $\hat{\boldsymbol\beta}=(X^\top X)^{-1}X^\top\boldsymbol y$。$E[\hat{\boldsymbol\beta}]=\boldsymbol\beta$、$V[\hat{\boldsymbol\beta}]=\sigma^2(X^\top X)^{-1}$。
3. **ガウス・マルコフの定理**：誤差が平均 $0$・等分散・無相関なら、最小二乗推定量は線形不偏推定量のなかで分散が最小（BLUE）。正規性は不要。
4. **誤差分散の推定**：$\hat\sigma^2=\frac{\mathrm{RSS}}{n-p-1}$ は不偏。正規性のもとで $\mathrm{RSS}/\sigma^2\sim\chi^2(n-p-1)$。
5. **係数の検定**：$H_0:\beta_j=0$ に対し $t=\hat\beta_j/\widehat{\mathrm{SE}}(\hat\beta_j)\sim t(n-p-1)$。
6. **モデル全体の検定**：$H_0:\beta_1=\cdots=\beta_p=0$ に対し $F=\frac{\mathrm{ESS}/p}{\mathrm{RSS}/(n-p-1)}=\frac{R^2/p}{(1-R^2)/(n-p-1)}\sim F(p,\ n-p-1)$。

## 落とし穴

- **$R^2$ は説明変数を増やすと必ず増える（減らない）**。モデル比較には自由度調整済み決定係数 $\bar R^2=1-\frac{\mathrm{RSS}/(n-p-1)}{\mathrm{TSS}/(n-1)}$ や AIC を使う。
- **自由度の数え方**：$p$ が「切片を除く説明変数の数」か「切片を含むパラメータ数」かで $n-p-1$ と $n-p$ が入れ替わる。
- **多重共線性**：説明変数間の相関が強いと $(X^\top X)^{-1}$ の対角成分が大きくなり、個々の係数の標準誤差が膨らむ（予測は悪化しないこともある）。
- **切片のないモデル**では平方和の分解が成り立たず、通常の $R^2$ は解釈できない。
