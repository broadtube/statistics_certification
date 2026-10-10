---
title: ブートストラップ
category: bayes
order: 3
summary: ブートストラップ推定、パーセンタイル信頼区間、ジャックナイフ
---

## 定義

観測値 $x_1,\dots,x_n$ から統計量 $\hat\theta=t(x_1,\dots,x_n)$ を計算したとする。

- **経験分布** $\hat F_n$：各観測値に確率 $1/n$ を与える離散分布。
- **（ノンパラメトリック）ブートストラップ標本**：$\hat F_n$ から大きさ $n$ の標本を **復元抽出** したもの $x_1^*,\dots,x_n^*$。これを $B$ 回繰り返し、各回の統計量 $\hat\theta^{*}_1,\dots,\hat\theta^{*}_B$ を求める。
- **ブートストラップ標準誤差**：
  $$
  \widehat{\mathrm{SE}}_{\mathrm{boot}}=\sqrt{\frac{1}{B-1}\sum_{b=1}^{B}\left(\hat\theta^{*}_b-\bar\theta^{*}\right)^2},\qquad \bar\theta^{*}=\frac1B\sum_{b=1}^B\hat\theta^{*}_b
  $$
- **バイアスの推定**：$\widehat{\mathrm{bias}}=\bar\theta^{*}-\hat\theta$。バイアス補正推定量は $\hat\theta-\widehat{\mathrm{bias}}=2\hat\theta-\bar\theta^{*}$。
- **パラメトリック・ブートストラップ**：経験分布の代わりに、推定したパラメトリックモデル $F_{\hat\theta}$ から標本を生成する方法。
- **ジャックナイフ**：観測値を1つずつ除いた $n$ 個の標本で統計量 $\hat\theta_{(-i)}$ を計算し、その平均 $\hat\theta_{(\cdot)}$ を使ってバイアスと標準誤差を推定する方法。

## 導出の流れ

1. **考え方（プラグイン原理）**：未知の母集団分布 $F$ のもとでの $\hat\theta$ の分布を、$F$ を $\hat F_n$ に置き換えた世界での $\hat\theta^*$ の分布で近似する。$\hat F_n$ のもとでの計算は解析的に難しいので、モンテカルロ法（$B$ 回の再抽出）で近似する。
2. **パーセンタイル信頼区間**：$\hat\theta^*_b$ を小さい順に並べた分位点 $\hat\theta^*_{(\alpha/2)},\hat\theta^*_{(1-\alpha/2)}$ をそのまま区間とする。
   $$
   \left[\hat\theta^*_{(\alpha/2)},\ \hat\theta^*_{(1-\alpha/2)}\right]
   $$
3. **ベーシック（ピボット型）信頼区間**：$\hat\theta-\theta$ の分布を $\hat\theta^*-\hat\theta$ の分布で近似すると
   $$
   \left[2\hat\theta-\hat\theta^*_{(1-\alpha/2)},\ 2\hat\theta-\hat\theta^*_{(\alpha/2)}\right]
   $$
   ブートストラップ分布が $\hat\theta$ について対称ならパーセンタイル区間と一致する。
4. **特定の観測値が選ばれない確率**：1回の抽出で $x_i$ が選ばれない確率は $1-1/n$ なので、ブートストラップ標本に $x_i$ が含まれない確率は
   $$
   \left(1-\frac1n\right)^n\ \longrightarrow\ e^{-1}\approx0.368\quad(n\to\infty)
   $$
   つまり各ブートストラップ標本には元の観測値のおよそ63.2%が含まれる。
5. **異なるブートストラップ標本の数**：順序を区別しない（重複を許す組合せ）と $\binom{2n-1}{n}$ 通り。
6. **ジャックナイフ**：
   $$
   \widehat{\mathrm{bias}}_{\mathrm{jack}}=(n-1)\left(\hat\theta_{(\cdot)}-\hat\theta\right),\qquad \widehat{\mathrm{SE}}_{\mathrm{jack}}=\sqrt{\frac{n-1}{n}\sum_{i=1}^n\left(\hat\theta_{(-i)}-\hat\theta_{(\cdot)}\right)^2}
   $$
   標本平均に適用すると $\widehat{\mathrm{SE}}_{\mathrm{jack}}=s/\sqrt n$（$s$ は不偏分散の平方根）に一致する。

## 落とし穴

- 復元抽出であること。非復元で $n$ 個取り出すと元の標本の並べ替えにすぎない。
- $B$ を大きくして減るのは **モンテカルロ誤差** だけ。元の標本サイズ $n$ が小さいことによる誤差（$\hat F_n$ と $F$ のずれ）は減らない。
- **標本最大値**など分布の端に依存する統計量では、ブートストラップ分布は真の分布をうまく近似しない（$\max x_i^*=\max x_i$ となる確率が約 $0.632$ と大きい）。
- **従属データ**（時系列など）で各時点を独立に再抽出すると自己相関が壊れる。連続する区間をまとめて再抽出するブロック・ブートストラップなどを使う。
- ジャックナイフは滑らかでない統計量（**標本中央値** など）では標準誤差を一致推定できない。ブートストラップはこの場合も使える。
