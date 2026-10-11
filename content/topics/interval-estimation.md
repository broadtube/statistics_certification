---
title: 区間推定
category: inference
order: 2
summary: 信頼区間の構成、ピボット量、漸近的信頼区間
distributions: [normal, t, chisq, f]
---

## 定義

- **信頼区間**：標本から計算する区間 $[L,U]$ で、母数 $\theta$ の値によらず $P(L\le\theta\le U)=1-\alpha$ を満たすもの。$1-\alpha$ を **信頼係数**（信頼水準）という。
- **ピボット量**：標本と $\theta$ の関数 $Q(X_1,\dots,X_n;\theta)$ で、その分布が $\theta$ に依存しないもの。$P(a\le Q\le b)=1-\alpha$ となる $a,b$ をとり、不等式を $\theta$ について解くと信頼区間が得られる。
- **上側パーセント点**：以下では $z_\alpha$、$t_\alpha(m)$、$\chi^2_\alpha(m)$、$F_\alpha(m_1,m_2)$ をそれぞれ標準正規分布・自由度 $m$ の[[dist:t]]・[[dist:chisq]]・[[dist:f]]の **上側** $100\alpha\%$ 点とする（例：$z_{0.025}=1.96$）。
- **漸近的信頼区間**：標本サイズが大きいときに近似的に信頼係数 $1-\alpha$ をもつ区間。最尤推定量の漸近正規性（[[topic:point-estimation-mle]]）から作るワルド型区間が代表例。

## 導出の流れ

1. **正規母集団の平均（分散既知）**：$Z=\frac{\bar X-\mu}{\sigma/\sqrt n}\sim N(0,1)$ がピボット量。$P(-z_{\alpha/2}\le Z\le z_{\alpha/2})=1-\alpha$ を $\mu$ について解いて
   $$
   \bar X-z_{\alpha/2}\frac{\sigma}{\sqrt n}\le\mu\le\bar X+z_{\alpha/2}\frac{\sigma}{\sqrt n}
   $$
2. **正規母集団の平均（分散未知）**：$\sigma$ を標本標準偏差 $S$（$n-1$ で割る）で置き換えると $T=\frac{\bar X-\mu}{S/\sqrt n}\sim t(n-1)$。区間は $\bar X\pm t_{\alpha/2}(n-1)\,S/\sqrt n$。
3. **正規母集団の分散**：$\frac{(n-1)S^2}{\sigma^2}\sim\chi^2(n-1)$ をピボット量にして
   $$
   \frac{(n-1)S^2}{\chi^2_{\alpha/2}(n-1)}\le\sigma^2\le\frac{(n-1)S^2}{\chi^2_{1-\alpha/2}(n-1)}
   $$
   大きい方のパーセント点で割ったものが **下限** になる。
4. **2標本の平均の差**（等分散・分散未知）：プールした分散 $S_p^2=\frac{(m-1)S_1^2+(n-1)S_2^2}{m+n-2}$ を使い、$\bar X-\bar Y\pm t_{\alpha/2}(m+n-2)\,S_p\sqrt{\frac1m+\frac1n}$。
   分散が等しいと仮定しないときは、ウェルチの方法 $\bar X-\bar Y\pm t_{\alpha/2}(\nu)\sqrt{S_1^2/m+S_2^2/n}$（$\nu$ はサタースウェイトの近似自由度）を使う。
5. **分散比**：$\frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2}\sim F(m-1,n-1)$ から $\sigma_1^2/\sigma_2^2$ の区間が得られる。
6. **母比率**（大標本）：中心極限定理より $\frac{\hat p-p}{\sqrt{p(1-p)/n}}\approx N(0,1)$。分母の $p$ を $\hat p$ で置き換えたワルド型区間 $\hat p\pm z_{\alpha/2}\sqrt{\hat p(1-\hat p)/n}$ がよく使われる。
   2つの比率の差は $\hat p_1-\hat p_2\pm z_{\alpha/2}\sqrt{\hat p_1(1-\hat p_1)/n_1+\hat p_2(1-\hat p_2)/n_2}$（検定と違い、比率をプールしない）。
7. **必要な標本サイズ**：平均の区間の半幅を $E$ 以下にしたいときは $z_{\alpha/2}\sigma/\sqrt n\le E$ から $n\ge\left(z_{\alpha/2}\sigma/E\right)^2$。半幅は $1/\sqrt n$ に比例するので、半幅を半分にするには標本サイズが4倍必要。
8. **母相関係数**：フィッシャーの z 変換 $z=\tanh^{-1}r$ が近似的に $N\left(\tanh^{-1}\rho,\ \frac{1}{n-3}\right)$ に従うことを使い、$z\pm z_{\alpha/2}/\sqrt{n-3}$ の両端を $\tanh$ で戻す。

## 落とし穴

- **信頼係数の解釈**：「95%信頼区間に $\theta$ が含まれる確率が0.95」なのは標本を取る前の話。計算済みの区間（数値）について $\theta$ は定数なので、含むか含まないかのどちらかである。正しくは「同じ手順を繰り返すと、作られる区間の約95%が $\theta$ を含む」。
- **分散の信頼区間は非対称**：$\chi^2$ 分布は左右非対称なので、$S^2$ は区間の中央にない。下限・上限で使うパーセント点の取り違えに注意。
- **自由度**：分散未知の平均の区間は $t(n-1)$。$n$ が小さいときに $z$ を使うと区間が狭すぎる。
- **ワルド型の比率区間** は $n$ が小さいときや $p$ が $0$・$1$ に近いときに被覆確率が名目より低くなる。$\hat p=0$ なら幅が $0$ になってしまう。
- 信頼区間と検定は表裏一体：両側検定 $H_0:\theta=\theta_0$ が有意水準 $\alpha$ で棄却されないことと、$\theta_0$ が信頼係数 $1-\alpha$ の信頼区間に含まれることは同値（同じピボット量を使う場合）。[[topic:hypothesis-testing]] も参照。
