---
title: 確率変数と期待値
category: probability
order: 2
summary: 期待値・分散・共分散、積率母関数、条件付き期待値
---

## 定義

- **期待値**：離散型なら $E[X]=\sum_x x\,p(x)$、連続型なら $E[X]=\int x f(x)\,dx$。関数についても $E[g(X)]=\int g(x)f(x)\,dx$（分布を求め直す必要はない）。
- **線形性**：$E[aX+bY+c]=aE[X]+bE[Y]+c$。独立性は不要。
- **分散**：$V[X]=E[(X-\mu)^2]=E[X^2]-(E[X])^2$、$V[aX+b]=a^2V[X]$（[[formula:rv-variance-shortcut]]）。
- **共分散・相関係数**：$\mathrm{Cov}(X,Y)=E[(X-\mu_X)(Y-\mu_Y)]=E[XY]-E[X]E[Y]$、$\rho=\dfrac{\mathrm{Cov}(X,Y)}{\sqrt{V[X]V[Y]}}$、$-1\le\rho\le1$。
- **積率母関数（MGF）**：$M_X(t)=E[e^{tX}]$。原点まわりのモーメントは $E[X^k]=M_X^{(k)}(0)$。$0$ の近傍で存在すれば分布を一意に決める。
- **条件付き期待値**：$E[X\mid Y=y]=\int x\,f(x\mid y)\,dx$。$E[X\mid Y]$ は $Y$ の関数である確率変数。

## 導出の流れ

1. **和の分散**：$V[aX+bY]=E[\{a(X-\mu_X)+b(Y-\mu_Y)\}^2]$ を展開して
   $$
   V[aX+bY]=a^2V[X]+b^2V[Y]+2ab\,\mathrm{Cov}(X,Y)
   $$
   独立（または無相関）なら共分散の項が消える（[[formula:rv-variance-linear-combination]]）。
2. **標本平均の分散**：$X_1,\dots,X_n$ が独立で分散 $\sigma^2$ なら $V[\bar X]=\sigma^2/n$。
3. **独立な和の MGF**：$X,Y$ が独立なら $M_{X+Y}(t)=E[e^{tX}]E[e^{tY}]=M_X(t)M_Y(t)$。これと一意性から、ポアソン分布・正規分布・ガンマ分布（尺度が共通）の再生性が示せる（[[formula:rv-mgf-independent-sum]]）。
4. **繰り返し期待値の法則**：$E[X]=E[E[X\mid Y]]$（[[formula:rv-law-total-expectation]]）。
5. **全分散の公式**：$V[X]=E[V[X\mid Y]]+V[E[X\mid Y]]$（グループ内のばらつきの平均＋グループ間のばらつき）（[[formula:rv-law-total-variance]]）。
6. **例（複合ポアソン）**：$N\sim\mathrm{Po}(\lambda)$、$Y_i$ は独立に平均 $\mu$・分散 $s^2$ で $N$ とも独立のとき、$S=\sum_{i=1}^N Y_i$ について
   $E[S]=E[N\mu]=\lambda\mu$、$V[S]=E[Ns^2]+V[N\mu]=\lambda s^2+\lambda\mu^2=\lambda(s^2+\mu^2)$。

## 落とし穴

- **無相関でも独立とは限らない**：$X\sim N(0,1)$、$Y=X^2$ なら $\mathrm{Cov}(X,Y)=E[X^3]=0$ だが、$Y$ は $X$ で決まる。独立なら無相関（逆は一般に不成立）。ただし多変量正規分布では無相関と独立が同値（[[topic:multivariate-transform]]）。
- $E[XY]=E[X]E[Y]$ や $V[X+Y]=V[X]+V[Y]$ は **無相関** のときだけ成り立つ。$E[g(X)]\ne g(E[X])$ にも注意（例：$E[X^2]\ge(E[X])^2$、一般にはイェンセンの不等式）。
- $V[X-Y]=V[X]+V[Y]-2\mathrm{Cov}(X,Y)$。独立なら差の分散も **和** になる。
- MGF は存在しないことがある（[[dist:cauchy]] や [[dist:t]] など）。その場合は特性関数 $E[e^{itX}]$ を使う。
