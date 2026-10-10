---
title: 尤度比検定と漸近論
category: inference
order: 5
summary: 尤度比検定、ワルド検定、スコア検定、フィッシャー情報量
distributions: [chisq, normal]
---

## 定義

対数尤度を $\ell(\theta)$、最尤推定量を $\hat\theta$、1観測あたりのフィッシャー情報量を $I(\theta)$ とする（[[topic:point-estimation-mle]]）。帰無仮説を $H_0:\theta\in\Theta_0$、全母数空間を $\Theta$ とする。

- **尤度比**：
  $$
  \Lambda=\frac{\sup_{\theta\in\Theta_0}L(\theta)}{\sup_{\theta\in\Theta}L(\theta)}\quad(0\le\Lambda\le1)
  $$
  $\Lambda$ が小さい（$H_0$ のもとでの最大尤度が相対的に低い）とき $H_0$ を棄却する。これを **尤度比検定** という。
- **ウィルクスの定理**：正則条件のもとで、$H_0$ が正しければ
  $$
  -2\log\Lambda=2\left\{\ell(\hat\theta)-\ell(\hat\theta_0)\right\}\xrightarrow{d}\chi^2(r)
  $$
  ここで $\hat\theta_0$ は $H_0$ のもとでの最尤推定量、$r=\dim\Theta-\dim\Theta_0$（$H_0$ で制約される母数の個数）。
- **スコア関数**：$U(\theta)=\ell'(\theta)=\sum_{i=1}^n\frac{\partial}{\partial\theta}\log f(X_i;\theta)$。$E_\theta[U(\theta)]=0$、$V_\theta[U(\theta)]=nI(\theta)$。
- 1母数で $H_0:\theta=\theta_0$ のとき、次の3つの検定統計量は $H_0$ のもとでいずれも近似的に $\chi^2(1)$ に従う。
  - **尤度比検定**：$2\{\ell(\hat\theta)-\ell(\theta_0)\}$
  - **ワルド検定**：$W=(\hat\theta-\theta_0)^2\,nI(\hat\theta)$
  - **スコア検定**（ラグランジュ乗数検定）：$S=\dfrac{U(\theta_0)^2}{nI(\theta_0)}$

## 導出の流れ

1. **正規平均（分散既知）の例**：$H_0:\mu=\mu_0$ では $\ell(\bar x)-\ell(\mu_0)=\frac{n(\bar x-\mu_0)^2}{2\sigma^2}$ なので $-2\log\Lambda=\left(\frac{\bar x-\mu_0}{\sigma/\sqrt n}\right)^2=z^2$。この場合は近似ではなく正確に $\chi^2(1)$ で、z 検定と一致する。
2. **ポアソン分布の例**：$\hat\lambda=\bar x$ で
   $$
   -2\log\Lambda=2n\left\{\bar x\log\frac{\bar x}{\lambda_0}-(\bar x-\lambda_0)\right\}
   $$
3. **ウィルクスの定理の考え方**：$\ell(\theta_0)$ を $\hat\theta$ の周りで2次までテイラー展開すると、$\ell'(\hat\theta)=0$ より $2\{\ell(\hat\theta)-\ell(\theta_0)\}\approx n I(\theta)(\hat\theta-\theta_0)^2$。最尤推定量の漸近正規性 $\sqrt{nI(\theta_0)}(\hat\theta-\theta_0)\xrightarrow{d}N(0,1)$ より、これは $\chi^2(1)$ に近づく。多母数でも同様に、制約の個数が自由度になる。
4. **3つの検定の関係**：対数尤度が2次関数（正規分布の平均など）なら3つは一致する。一般には大標本で同等（漸近的に同じ分布）だが、有限標本では値が異なる。
   - ワルド検定は **全モデルの推定** だけで計算できる。
   - スコア検定は **$H_0$ のもとでの推定** だけで計算できる。
   - 尤度比検定は両方の最大対数尤度を使う。
5. **信頼区間との対応**：$\{\theta_0:2\{\ell(\hat\theta)-\ell(\theta_0)\}\le\chi^2_\alpha(1)\}$ は尤度比に基づく信頼区間になる。ワルド検定を反転すると $\hat\theta\pm z_{\alpha/2}/\sqrt{nI(\hat\theta)}$ が得られる。
6. **モデル比較**：入れ子になった2つのモデルを比べるとき、$2(\text{大きいモデルの最大対数尤度}-\text{小さいモデルの最大対数尤度})$ を自由度「母数の個数の差」のカイ二乗分布と比べる。GLM の逸脱度の差の検定（[[topic:glm]]）はこの応用。

## 落とし穴

- **自由度は「制約の個数」**：$-2\log\Lambda$ の自由度はデータ数ではなく、$H_0$ で固定・制約される母数の個数。
- **符号**：$\Lambda\le1$ なので $-2\log\Lambda\ge0$。$2\{\ell(\hat\theta_0)-\ell(\hat\theta)\}$ のように引き算の順を逆にすると負になる。
- **ワルド検定はパラメータ化に依存する**：$\theta$ で検定するか $\log\theta$ で検定するかで統計量の値が変わる。尤度比検定は再パラメータ化しても不変。
- **境界上の帰無仮説**（分散成分 $=0$ など）や、台が母数に依存する分布では正則条件が崩れ、ウィルクスの定理がそのままでは成り立たない。
- いずれも **漸近** 的な結果であり、小標本では名目の有意水準からずれることがある。
