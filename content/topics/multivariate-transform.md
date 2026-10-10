---
title: 多変量分布と変数変換
category: probability
order: 5
summary: 同時分布・周辺分布、ヤコビアンによる変数変換、多変量正規分布
distributions: [multivariate-normal, multinomial]
---

## 定義

- **同時密度** $f(x,y)$：$P((X,Y)\in A)=\iint_A f(x,y)\,dx\,dy$。
- **周辺密度**：$f_X(x)=\int f(x,y)\,dy$。**条件付き密度**：$f(y\mid x)=f(x,y)/f_X(x)$（$f_X(x)>0$）（[[formula:mvt-marginal-conditional]]）。
- **独立**：すべての $x,y$ で $f(x,y)=f_X(x)f_Y(y)$。同時密度が $g(x)h(y)$ の形に分解でき、台が長方形なら独立。
- **多変量正規分布** $N_p(\boldsymbol\mu,\Sigma)$（[[dist:multivariate-normal]]）：
  $$
  f(\boldsymbol x)=\frac{1}{(2\pi)^{p/2}|\Sigma|^{1/2}}\exp\left\{-\frac12(\boldsymbol x-\boldsymbol\mu)^\top\Sigma^{-1}(\boldsymbol x-\boldsymbol\mu)\right\}
  $$
  $\boldsymbol\mu$ は平均ベクトル、$\Sigma$ は分散共分散行列（正定値）。
- **多項分布**（[[dist:multinomial]]）：$n$ 回の独立試行で $k$ 種類の結果の回数 $(N_1,\dots,N_k)$ の分布。$\mathrm{Cov}(N_i,N_j)=-np_ip_j\ (i\ne j)$ と負の相関をもつ。

## 導出の流れ

1. **1変数の変数変換**：$Y=g(X)$ で $g$ が単調なら $f_Y(y)=f_X(g^{-1}(y))\left|\frac{d}{dy}g^{-1}(y)\right|$。単調でなければ分布関数 $P(Y\le y)$ から求める（例：$Y=X^2$ では $\pm\sqrt y$ の2つの枝を足す）。
2. **多変数の変数変換**：1対1の変換 $(U,V)=g(X,Y)$ の逆変換を $x=x(u,v)$、$y=y(u,v)$ とすると
   $$
   f_{U,V}(u,v)=f_{X,Y}\big(x(u,v),y(u,v)\big)\,|J|,\qquad J=\det\begin{pmatrix}\partial x/\partial u&\partial x/\partial v\\ \partial y/\partial u&\partial y/\partial v\end{pmatrix}
   $$
   （[[formula:mvt-jacobian-transform]]）。
3. **和の分布（たたみ込み）**：$X,Y$ が独立なら $f_{X+Y}(s)=\int f_X(x)f_Y(s-x)\,dx$。例えば独立な $\mathrm{Ex}(\lambda)$ の和は $\lambda^2se^{-\lambda s}$（$\mathrm{Ga}(2,\lambda)$）。
4. **多変量正規分布の線形変換**：$\boldsymbol Y=A\boldsymbol X+\boldsymbol b$ なら $\boldsymbol Y\sim N(A\boldsymbol\mu+\boldsymbol b,\ A\Sigma A^\top)$。特に $\boldsymbol a^\top\boldsymbol X\sim N(\boldsymbol a^\top\boldsymbol\mu,\ \boldsymbol a^\top\Sigma\boldsymbol a)$（[[formula:mvt-mvn-linear-transform]]）。
5. **2変量正規分布の条件付き分布**：
   $$
   Y\mid X=x\ \sim\ N\left(\mu_Y+\rho\frac{\sigma_Y}{\sigma_X}(x-\mu_X),\ \sigma_Y^2(1-\rho^2)\right)
   $$
   条件付き期待値は $x$ の1次式（回帰直線）で、条件付き分散は $x$ によらない（[[formula:mvt-bivariate-normal-conditional]]）。

## 落とし穴

- **ヤコビアンは逆変換で計算する**（または順変換のヤコビアンの逆数）。絶対値をとり忘れない。また新しい変数の **台（値域）** を必ず求め直す。
- **周辺が正規でも同時分布が正規とは限らない**。「各成分が正規かつ無相関」だけでは独立を言えない。無相関なら独立と言えるのは、**同時に** 多変量正規分布に従うとき。
- 同時密度が $g(x)h(y)$ の形でも、台が $0<x<y<1$ のように長方形でなければ独立ではない。
- 条件付き分散 $\sigma_Y^2(1-\rho^2)$ は周辺分散 $\sigma_Y^2$ 以下。$x$ を知ることでばらつきが減る割合が $\rho^2$（決定係数）。
