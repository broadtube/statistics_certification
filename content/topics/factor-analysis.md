---
title: 因子分析
category: multivariate
order: 2
summary: 因子モデル、共通性、因子回転
---

## 定義

観測される $p$ 個の変数 $\boldsymbol x=(x_1,\dots,x_p)^\top$ が、観測されない $m$ 個（$m<p$）の **共通因子** $\boldsymbol f$ と、変数ごとの **独自因子** $\boldsymbol\varepsilon$ で説明されると考えるモデルを **因子分析モデル** という。

$$
\boldsymbol x=\boldsymbol\mu+\Lambda\boldsymbol f+\boldsymbol\varepsilon
$$

- $\Lambda=(\lambda_{jk})$ は $p\times m$ の **因子負荷行列**。$\lambda_{jk}$ は変数 $x_j$ の第 $k$ 因子への負荷量。
- 仮定（直交因子モデル）：$E[\boldsymbol f]=\boldsymbol 0$、$V[\boldsymbol f]=I_m$、$E[\boldsymbol\varepsilon]=\boldsymbol 0$、$V[\boldsymbol\varepsilon]=\Psi=\mathrm{diag}(\psi_1,\dots,\psi_p)$、$\boldsymbol f$ と $\boldsymbol\varepsilon$ は無相関。
- このとき分散共分散行列は $\Sigma=\Lambda\Lambda^\top+\Psi$ と分解される（[[formula:fa-covariance-structure]]）。
- **共通性** $h_j^2=\sum_{k=1}^m\lambda_{jk}^2$：$x_j$ の分散のうち共通因子で説明される部分。**独自分散** $\psi_j=\sigma_{jj}-h_j^2$（標準化した変数なら $1-h_j^2$）。

## 導出の流れ

1. モデル式から $V[\boldsymbol x]=\Lambda V[\boldsymbol f]\Lambda^\top+V[\boldsymbol\varepsilon]=\Lambda\Lambda^\top+\Psi$。対角成分を見ると $\sigma_{jj}=h_j^2+\psi_j$、非対角成分は $\sigma_{ij}=\sum_k\lambda_{ik}\lambda_{jk}$（$i\ne j$）で、変数間の相関はすべて共通因子を通して生じる。
2. **1因子モデル**（標準化変数）では $r_{ij}=\lambda_i\lambda_j$ となる。3変数なら $\lambda_1^2=\dfrac{r_{12}r_{13}}{r_{23}}$ のように、相関係数だけから負荷量の大きさが求まる。
3. **推定**：主因子法（共通性の初期値を相関行列の対角に入れて固有値分解を繰り返す）や **最尤法**（$\boldsymbol x$ に多変量正規分布を仮定）が使われる。最尤法では「因子数 $m$ で十分」という仮説の尤度比検定ができ、自由度は $\frac{(p-m)^2-(p+m)}{2}$。
4. **回転の不定性**：任意の直交行列 $T$ について $(\Lambda T)(\Lambda T)^\top=\Lambda\Lambda^\top$ なので、$\Lambda$ は回転を除いてしか定まらない。解釈しやすくするため、各因子に大きな負荷と0に近い負荷がはっきり分かれるよう回転する。直交回転の代表が **バリマックス回転**、因子間の相関を許す斜交回転の代表が **プロマックス回転**。
5. **因子得点**：$\boldsymbol f$ は観測されないので推定する。回帰法では $\hat{\boldsymbol f}=\Lambda^\top\Sigma^{-1}(\boldsymbol x-\boldsymbol\mu)$。

## 落とし穴

- **主成分分析との違い**：主成分分析は観測変数の線形結合で分散を要約する手法で、誤差項のモデルを持たない。因子分析は観測変数を共通因子と独自因子に分解する確率モデルで、相関構造（共分散）を説明することが目的（[[topic:pca]]）。
- **直交回転では共通性も適合度も変わらない**：回転で変わるのは負荷量の見え方だけ。回転によってモデルの当てはまりが良くなるわけではない。
- **斜交回転後は負荷量の読み方が変わる**：因子間に相関があるので、因子パターン（負荷量）と因子構造（変数と因子の相関）が一致しない。
- **不適解（ハイウッドケース）**：推定した独自分散が0以下（共通性が1以上）になることがある。因子数や変数の選び方を見直す。
- 因子数は、最尤法の適合度検定、相関行列の固有値が1以上の数、スクリープロット、解釈可能性などを総合して決める。
