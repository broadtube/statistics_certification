---
title: 確率の基礎・条件付き確率
category: probability
order: 1
summary: 確率の公理、条件付き確率、ベイズの定理、独立性
---

## 定義

- **標本空間** $\Omega$ は起こりうる結果全体、その部分集合が **事象**。確率 $P$ は次の **公理**（コルモゴロフ）を満たす関数：
  1. 任意の事象 $A$ について $P(A)\ge0$
  2. $P(\Omega)=1$
  3. 互いに排反な事象 $A_1,A_2,\dots$ について $P\left(\bigcup_i A_i\right)=\sum_i P(A_i)$（可算加法性）
- 公理から $P(A^c)=1-P(A)$、$P(\emptyset)=0$、$A\subset B\Rightarrow P(A)\le P(B)$ が導かれる。
- **加法定理**（包除原理）：$P(A\cup B)=P(A)+P(B)-P(A\cap B)$（[[formula:prob-inclusion-exclusion]]）。
- **条件付き確率**：$P(B)>0$ のとき $P(A\mid B)=\dfrac{P(A\cap B)}{P(B)}$。乗法定理 $P(A\cap B)=P(B)P(A\mid B)$ と同値。
- **独立**：$P(A\cap B)=P(A)P(B)$ のとき $A$ と $B$ は独立。$P(B)>0$ なら $P(A\mid B)=P(A)$ と同値。
- 3つ以上の事象 $A_1,\dots,A_n$ が **（相互に）独立** とは、任意の部分集合 $\{i_1,\dots,i_k\}$ について $P(A_{i_1}\cap\cdots\cap A_{i_k})=P(A_{i_1})\cdots P(A_{i_k})$ が成り立つこと。

## 導出の流れ

1. **全確率の公式**：$B_1,\dots,B_k$ が $\Omega$ の分割（互いに排反で和集合が $\Omega$）なら、
   $A=\bigcup_j (A\cap B_j)$ が排反な和なので $P(A)=\sum_j P(B_j)P(A\mid B_j)$（[[formula:prob-total-probability]]）。
2. **ベイズの定理**：条件付き確率の定義を2通りに書き、分母に全確率の公式を使う。
   $$
   P(B_j\mid A)=\frac{P(B_j)P(A\mid B_j)}{\sum_{l}P(B_l)P(A\mid B_l)}
   $$
   $P(B_j)$ を **事前確率**、$P(B_j\mid A)$ を **事後確率** という（[[formula:prob-bayes-rule-events]]）。分布に対するベイズ推定は [[topic:bayes-conjugate]] を参照。
3. **例（検査の陽性的中率）**：有病率 $\pi$、感度 $P(+\mid D)=s$、特異度 $P(-\mid D^c)=c$ のとき
   $P(D\mid +)=\dfrac{\pi s}{\pi s+(1-\pi)(1-c)}$。有病率が小さいと、感度・特異度が高くても陽性的中率は低くなる。
4. **余事象の利用**：「少なくとも1回起こる」確率は $1-P(\text{1回も起こらない})$ として計算する。独立な試行なら $1-(1-p)^n$。
5. **包除原理の一般形**：$P\left(\bigcup_{i=1}^n A_i\right)=\sum_i P(A_i)-\sum_{i<j}P(A_i\cap A_j)+\cdots+(-1)^{n-1}P(A_1\cap\cdots\cap A_n)$。

## 落とし穴

- **排反と独立は別物**：$P(A)>0$、$P(B)>0$ で $A,B$ が排反なら $P(A\cap B)=0\ne P(A)P(B)$ なので独立ではない。
- **対独立は相互独立を意味しない**：コインを2回投げ、$A$＝1回目が表、$B$＝2回目が表、$C$＝2回の結果が一致、とすると、どの2つも独立だが $P(A\cap B\cap C)=\frac14\ne\frac18$。
- **$P(A\mid B)$ と $P(B\mid A)$ を混同しない**（検察官の誤謬）。感度 $P(+\mid D)$ と陽性的中率 $P(D\mid +)$ は一般に大きく異なる。
- 条件付き確率 $P(\cdot\mid B)$ も確率の公理を満たすので、$P(A^c\mid B)=1-P(A\mid B)$ のように通常の計算規則が使える。ただし $P(A\mid B^c)=1-P(A\mid B)$ は一般には成り立たない。
