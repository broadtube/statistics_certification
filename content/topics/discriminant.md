---
title: 判別分析
category: multivariate
order: 3
summary: 線形判別、マハラノビス距離、誤判別率
distributions: [multivariate-normal]
---

## 定義

所属群がわかっている学習データをもとに、新しい個体 $\boldsymbol x$ がどの群に属するかを判定する規則を作る手法を **判別分析** という。

- **マハラノビス距離**：平均 $\boldsymbol\mu$、分散共分散行列 $\Sigma$ の群から $\boldsymbol x$ までの距離を $D^2(\boldsymbol x,\boldsymbol\mu)=(\boldsymbol x-\boldsymbol\mu)^\top\Sigma^{-1}(\boldsymbol x-\boldsymbol\mu)$ で測る。変数間の相関と尺度の違いを考慮した距離。
- **フィッシャーの線形判別**：2群の平均 $\boldsymbol\mu_1,\boldsymbol\mu_2$、共通の分散共分散行列 $\Sigma$ のもとで、群間の差を群内のばらつきに比べて最も大きくする方向 $\boldsymbol a\propto\Sigma^{-1}(\boldsymbol\mu_1-\boldsymbol\mu_2)$ に射影して判別する。
- **ベイズ判別**：事前確率 $\pi_k$ と群ごとの密度 $f_k(\boldsymbol x)$ を使い、事後確率に比例する $\pi_kf_k(\boldsymbol x)$ が最大の群に判別する。誤判別確率（の期待値）を最小にする規則。
- 2群の母平均の違いの大きさを $\Delta^2=(\boldsymbol\mu_1-\boldsymbol\mu_2)^\top\Sigma^{-1}(\boldsymbol\mu_1-\boldsymbol\mu_2)$（群間のマハラノビス平方距離）で表す。

## 導出の流れ

1. **フィッシャーの基準**：射影 $y=\boldsymbol a^\top\boldsymbol x$ について、$\dfrac{\{\boldsymbol a^\top(\boldsymbol\mu_1-\boldsymbol\mu_2)\}^2}{\boldsymbol a^\top\Sigma\boldsymbol a}$ を最大化する。$\boldsymbol a$ で微分して整理すると $\boldsymbol a\propto\Sigma^{-1}(\boldsymbol\mu_1-\boldsymbol\mu_2)$。最大値は $\Delta^2$。
2. **正規分布のもとでのベイズ判別**：$f_k$ が $N_p(\boldsymbol\mu_k,\Sigma)$（共分散が共通）のとき、$\log\{\pi_1f_1(\boldsymbol x)\}-\log\{\pi_2f_2(\boldsymbol x)\}$ の2次の項は打ち消し合い、
   $$
   (\boldsymbol\mu_1-\boldsymbol\mu_2)^\top\Sigma^{-1}\left(\boldsymbol x-\frac{\boldsymbol\mu_1+\boldsymbol\mu_2}{2}\right)>\log\frac{\pi_2}{\pi_1}
   $$
   なら群1と判別する（[[formula:lda-linear-rule]]）。判別境界は超平面で、事前確率が等しければフィッシャーの線形判別と一致する。事前確率が等しいときは「マハラノビス距離が近い群に判別する」のと同じ。
3. **誤判別確率**：上の規則（事前確率が等しい場合）では、判別得点は各群のもとで分散 $\Delta^2$ の正規分布に従い、平均は $\pm\Delta^2/2$。よって各群の誤判別確率は $\Phi(-\Delta/2)$。
4. **共分散行列が群で異なる** 場合は2次の項が残り、判別境界は2次曲面になる（**2次判別**）。
5. 実際には $\boldsymbol\mu_k$ は群ごとの標本平均、$\Sigma$ はプールした標本分散共分散行列で推定する。

## 落とし穴

- **見かけの誤判別率は楽観的**：判別規則を作ったデータそのものでの誤判別率は、新しいデータに対する誤判別率より小さくなりがち。一つ抜き交差検証（leave-one-out）などで評価する。
- **マハラノビス距離は尺度に依存しない**：変数を正則な線形変換（単位の変更を含む）しても値は変わらない。ユークリッド距離とは異なる。
- 係数ベクトルは $\Sigma^{-1}(\boldsymbol\mu_1-\boldsymbol\mu_2)$ に比例する（$\Sigma(\boldsymbol\mu_1-\boldsymbol\mu_2)$ ではない）。
- 誤分類のコストが群で異なる場合は、しきい値 $\log(\pi_2/\pi_1)$ をコストも含めた $\log\{c(1|2)\pi_2/(c(2|1)\pi_1)\}$ に置き換える。
- 正規性や共分散の等しさが疑わしい場合は、ロジスティック回帰（[[topic:glm]]）や機械学習の手法（[[topic:machine-learning]]）も候補になる。
