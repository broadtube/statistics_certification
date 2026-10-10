---
title: 状態空間モデル
category: timeseries
order: 4
summary: ローカルレベルモデル、カルマンフィルタ
---

## 定義

- **状態空間モデル**：観測できない状態 $\alpha_t$ の時間発展（状態方程式）と、状態から観測値 $y_t$ が生じる仕組み（観測方程式）の2本で表すモデル。線形ガウス型では
  $$
  y_t=Z\alpha_t+\varepsilon_t,\quad \varepsilon_t\sim N(0,H),\qquad \alpha_{t+1}=T\alpha_t+\eta_t,\quad \eta_t\sim N(0,Q)
  $$
  （$\varepsilon_t$ と $\eta_t$ は互いに独立で、時点間でも独立）。
- **ローカルレベルモデル**：水準 $\mu_t$ がランダムウォークし、観測値はそれにノイズが乗ったもの。
  $$
  y_t=\mu_t+\varepsilon_t,\quad \varepsilon_t\sim N(0,\sigma_\varepsilon^2),\qquad \mu_{t+1}=\mu_t+\eta_t,\quad \eta_t\sim N(0,\sigma_\eta^2)
  $$
  $q=\sigma_\eta^2/\sigma_\varepsilon^2$ を **信号対雑音比** という。
- 状態の推定は、使う観測値の範囲で3種類に分かれる。
  - **予測**：$y_1,\dots,y_{t-1}$ から $\alpha_t$ を推定（$a_{t|t-1}$、分散 $P_{t|t-1}$）
  - **フィルタリング**：$y_1,\dots,y_t$ から $\alpha_t$ を推定（$a_{t|t}$、分散 $P_{t|t}$）
  - **平滑化**：全期間 $y_1,\dots,y_n$ から $\alpha_t$ を推定
- **カルマンフィルタ**：予測とフィルタリングを逐次的に計算するアルゴリズム。

## 導出の流れ

ローカルレベルモデルで、時点 $t$ の予測 $a_{t|t-1}$、$P_{t|t-1}$ が得られているとする。

1. **一期先予測誤差**：$v_t=y_t-a_{t|t-1}$、その分散 $F_t=P_{t|t-1}+\sigma_\varepsilon^2$。
2. **カルマンゲイン**：$K_t=\dfrac{P_{t|t-1}}{P_{t|t-1}+\sigma_\varepsilon^2}$（$0<K_t<1$）。
3. **フィルタリング（更新）**：$(\mu_t,y_t)$ の同時正規分布から条件付き分布を求めると
   $$
   a_{t|t}=a_{t|t-1}+K_tv_t,\qquad P_{t|t}=(1-K_t)P_{t|t-1}
   $$
   予測値を予測誤差の $K_t$ 倍だけ観測値の方向に修正する。
4. **次期の予測**：状態方程式より $a_{t+1|t}=a_{t|t}$、$P_{t+1|t}=P_{t|t}+\sigma_\eta^2$。
5. **定常解**：$P=P_{t+1|t}$ が一定に収束するとき、$P=\frac{P\sigma_\varepsilon^2}{P+\sigma_\varepsilon^2}+\sigma_\eta^2$ を解いて
   $$
   \frac{P}{\sigma_\varepsilon^2}=\frac{q+\sqrt{q^2+4q}}{2},\qquad K=\frac{P}{P+\sigma_\varepsilon^2}
   $$
   このときフィルタは平滑化係数 $K$ の **指数平滑化** と一致する。
6. **尤度（予測誤差分解）**：$v_t\sim N(0,F_t)$ が互いに独立になることから
   $$
   \log L=-\frac12\sum_{t=1}^{n}\left(\log2\pi F_t+\frac{v_t^2}{F_t}\right)
   $$
   これを最大化して $\sigma_\varepsilon^2,\sigma_\eta^2$ を最尤推定する（[[topic:point-estimation-mle]]）。
7. **ARIMA との関係**：$\Delta y_t=\eta_{t-1}+\varepsilon_t-\varepsilon_{t-1}$ はラグ1のみに自己相関をもつので MA(1)。ローカルレベルモデルは ARIMA(0,1,1)（[[topic:unit-root-arima]]）と同じ自己相関構造をもつ。

## 落とし穴

- **$P_{t|t-1}$ と $K_t$ は観測値に依存しない**（線形ガウスモデル）。観測値の大きさで変わるのは $a_{t|t}$ だけ。
- $\sigma_\eta^2$ が大きい（$q$ が大きい）ほどカルマンゲインは $1$ に近づき、推定値は観測値に強く追従する。$\sigma_\eta^2=0$ なら水準は一定で、フィルタは逐次的な標本平均になる。
- フィルタ化推定量は **それまでの** 観測値しか使わない。平滑化推定量は将来の観測値も使うので、その分散はフィルタ化推定量の分散以下になる。
- 誤差が正規分布でなくても、カルマンフィルタは線形推定量の中で平均二乗誤差を最小にする（ただし条件付き期待値とは限らない）。
- 初期値 $a_{1|0},P_{1|0}$ の設定（散漫な初期化など）が序盤の推定に影響する。
