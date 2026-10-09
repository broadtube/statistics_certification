---
title: ARMA モデル
category: timeseries
order: 2
summary: AR・MA・ARMA モデルの定常性と反転可能性、自己相関関数と偏自己相関関数、ユール・ウォーカー方程式
---

## 定義

$\varepsilon_t$ を平均 $0$・分散 $\sigma^2$ のホワイトノイズとする。

- **AR($p$) モデル**：$X_t=\phi_1X_{t-1}+\cdots+\phi_pX_{t-p}+\varepsilon_t$
- **MA($q$) モデル**：$X_t=\varepsilon_t+\theta_1\varepsilon_{t-1}+\cdots+\theta_q\varepsilon_{t-q}$
- **ARMA($p,q$) モデル**：両者を組み合わせたもの。ラグ作用素 $B$（$BX_t=X_{t-1}$）を使うと $\phi(B)X_t=\theta(B)\varepsilon_t$。
- **定常性**（AR 部分）：特性方程式 $\phi(z)=1-\phi_1z-\cdots-\phi_pz^p=0$ のすべての根の絶対値が $1$ より大きい。AR(1) なら $|\phi|<1$。
- **反転可能性**（MA 部分）：$\theta(z)=0$ のすべての根の絶対値が $1$ より大きい。MA(1) なら $|\theta|<1$。

## 導出の流れ

1. **AR(1) の分散**：定常なら $V[X_t]=V[X_{t-1}]=\gamma_0$ なので、$\gamma_0=\phi^2\gamma_0+\sigma^2$ より $\gamma_0=\frac{\sigma^2}{1-\phi^2}$。
2. **AR(1) の自己相関**：$X_t=\phi X_{t-1}+\varepsilon_t$ の両辺に $X_{t-h}$ を掛けて期待値をとると $\gamma_h=\phi\gamma_{h-1}$。よって $\rho_h=\phi^{|h|}$（指数的に減衰）。
3. **MA(1) の自己相関**：$\gamma_0=(1+\theta^2)\sigma^2$、$\gamma_1=\theta\sigma^2$、$\gamma_h=0\ (h\ge2)$ より $\rho_1=\frac{\theta}{1+\theta^2}$。ラグ2以降で切断される。
4. **ユール・ウォーカー方程式**（AR(2)）：$\rho_h=\phi_1\rho_{h-1}+\phi_2\rho_{h-2}\ (h\ge1)$。$h=1$ で $\rho_1=\phi_1+\phi_2\rho_1$ より $\rho_1=\frac{\phi_1}{1-\phi_2}$、$h=2$ で $\rho_2=\phi_1\rho_1+\phi_2$。
5. **AR(2) の定常条件**：$\phi_1+\phi_2<1$、$\phi_2-\phi_1<1$、$|\phi_2|<1$（三角形の領域）。

| モデル | 自己相関関数（ACF） | 偏自己相関関数（PACF） |
| --- | --- | --- |
| AR($p$) | 減衰する | ラグ $p$ より先で $0$（切断） |
| MA($q$) | ラグ $q$ より先で $0$（切断） | 減衰する |
| ARMA($p,q$) | 減衰する | 減衰する |

## 落とし穴

- **MA(1) の $\rho_1$ は $|\rho_1|\le\frac12$**。$\theta$ と $1/\theta$ は同じ自己相関を与えるため、反転可能な方（$|\theta|<1$）を選んで識別する。
- **符号の流儀**：MA 部分を $X_t=\varepsilon_t-\theta\varepsilon_{t-1}$ と書く教科書もあり、その場合 $\rho_1=-\theta/(1+\theta^2)$ になる。問題文の定義に合わせる。
- AR 係数が $|\phi|<1$ でも、AR(2) 以上では個々の係数の大きさだけでは定常性を判定できない。特性方程式の根（または上の三角形条件）で判定する。
- 単位根（$\phi=1$）をもつ過程は非定常で、通常の回帰分析の漸近理論が使えない（[[topic:unit-root-arima]]）。
