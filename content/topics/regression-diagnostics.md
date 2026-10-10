---
title: 回帰診断
category: regression
order: 2
summary: 残差分析、てこ比、クックの距離、多重共線性
---

## 定義

- 重回帰モデル $\boldsymbol y=X\boldsymbol\beta+\boldsymbol\varepsilon$（$X$ は $n\times(p+1)$、切片を含む）の最小二乗推定値 $\hat{\boldsymbol\beta}=(X^\top X)^{-1}X^\top\boldsymbol y$ に対し、**ハット行列** $H=X(X^\top X)^{-1}X^\top$ を用いると $\hat{\boldsymbol y}=H\boldsymbol y$、**残差** $\boldsymbol e=(I-H)\boldsymbol y$ と書ける（[[formula:ols-matrix]]）。
- **てこ比（レバレッジ）**：$H$ の対角要素 $h_{ii}$。$0\le h_{ii}\le1$、$\sum_i h_{ii}=\mathrm{tr}H=p+1$ なので平均は $(p+1)/n$。説明変数の空間で中心から離れた観測ほど大きい。
- **残差の分散**：$V[e_i]=\sigma^2(1-h_{ii})$。てこ比の大きい観測の残差は小さくなりやすい。
- **標準化残差（内部スチューデント化残差）**：$r_i=\dfrac{e_i}{\hat\sigma\sqrt{1-h_{ii}}}$。
- **外部スチューデント化残差**：$i$ 番目を除いて推定した $\hat\sigma_{(i)}$ を使ったもの。誤差が正規分布のとき自由度 $n-p-2$ の [[dist:t]] に従う。
- **クックの距離**：$i$ 番目の観測を除いたときの当てはめ値全体の変化量。
  $$
  D_i=\frac{r_i^2}{p+1}\cdot\frac{h_{ii}}{1-h_{ii}}
  $$
- **分散拡大要因（VIF）**：$j$ 番目の説明変数を他の説明変数で回帰したときの決定係数を $R_j^2$ として $\mathrm{VIF}_j=1/(1-R_j^2)$。

## 導出の流れ

1. $H$ は対称かつべき等（$H^2=H$）。よって $V[\boldsymbol e]=(I-H)\sigma^2 I(I-H)^\top=\sigma^2(I-H)$ となり、$V[e_i]=\sigma^2(1-h_{ii})$。
2. $\mathrm{tr}H=\mathrm{tr}\{(X^\top X)^{-1}X^\top X\}=\mathrm{tr}I_{p+1}=p+1$。この平均値の2〜3倍を超える $h_{ii}$ をてこ比が高い目安とする。
3. 単回帰では $h_{ii}=\dfrac1n+\dfrac{(x_i-\bar x)^2}{\sum_j(x_j-\bar x)^2}$。$x_i$ が平均から離れるほどてこ比が大きい。
4. クックの距離は $D_i=\dfrac{(\hat{\boldsymbol\beta}_{(i)}-\hat{\boldsymbol\beta})^\top X^\top X(\hat{\boldsymbol\beta}_{(i)}-\hat{\boldsymbol\beta})}{(p+1)\hat\sigma^2}$ と定義され、1件除去の更新式から上の「残差の大きさ × てこ比」の積の形に書き直せる。$D_i>1$（あるいは $4/n$）を影響の大きい観測の目安とする。
5. $\hat\beta_j$ の分散は $V[\hat\beta_j]=\dfrac{\sigma^2}{\sum_i(x_{ij}-\bar x_j)^2}\cdot\mathrm{VIF}_j$ と分解できる。他の説明変数と相関が強いほど推定が不安定になる。
6. 残差プロット（当てはめ値 vs 残差）で非線形性・不等分散を、正規 Q-Q プロットで正規性を、時間順の残差やダービン・ワトソン統計量で自己相関を確認する。

## 落とし穴

- **外れ値（残差が大きい）とてこ比が高い点は別物**。てこ比の高い点は回帰直線を引き寄せるため、残差はむしろ小さく見えることがある。両者を合わせて見るのがクックの距離。
- 生の残差 $e_i$ は等分散ではない（$1-h_{ii}$ 倍）。外れ値の判定にはスチューデント化残差を使う。
- VIF が大きくても予測精度は必ずしも悪くない。問題になるのは個々の係数の解釈と検定（標準誤差の増大、符号の逆転）。
- 影響の大きい観測をただちに削除してはいけない。記録の誤りか、モデルの不備（非線形性・説明変数の欠落）かを検討する。
- ダービン・ワトソン統計量 $d\approx2(1-\hat\rho)$ は1次の自己相関しか見ていない。
