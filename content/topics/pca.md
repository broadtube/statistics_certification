---
title: 主成分分析
category: multivariate
order: 1
summary: 分散共分散行列・相関行列の固有値問題としての主成分、寄与率、主成分負荷量、主成分数の決め方
distributions: [multivariate-normal]
---

## 定義

$p$ 次元の確率ベクトル $\boldsymbol x$（分散共分散行列 $\Sigma$）に対し、分散が最大になる線形結合 $z_1=\boldsymbol a_1^\top\boldsymbol x$（$\|\boldsymbol a_1\|=1$）を **第1主成分** という。第 $k$ 主成分は、それまでの主成分と無相関という条件のもとで分散を最大にする線形結合。

- $\Sigma$ の固有値を $\lambda_1\ge\lambda_2\ge\cdots\ge\lambda_p\ge0$、対応する正規化固有ベクトルを $\boldsymbol a_1,\dots,\boldsymbol a_p$ とすると、第 $k$ 主成分は $z_k=\boldsymbol a_k^\top\boldsymbol x$ で $V[z_k]=\lambda_k$。
- **寄与率** $\lambda_k/\sum_{j=1}^p\lambda_j$、**累積寄与率** $\sum_{j\le k}\lambda_j/\sum_{j=1}^p\lambda_j$。
- **主成分負荷量**（主成分と元の変数の相関）：$r(z_k,x_j)=\sqrt{\lambda_k}\,a_{kj}/\sqrt{\sigma_{jj}}$。

## 導出の流れ

1. $V[\boldsymbol a^\top\boldsymbol x]=\boldsymbol a^\top\Sigma\boldsymbol a$ を制約 $\boldsymbol a^\top\boldsymbol a=1$ のもとで最大化する。
2. ラグランジュ関数 $\boldsymbol a^\top\Sigma\boldsymbol a-\lambda(\boldsymbol a^\top\boldsymbol a-1)$ を $\boldsymbol a$ で微分して $0$ とおくと $\Sigma\boldsymbol a=\lambda\boldsymbol a$（固有値問題）。
3. このとき $V[\boldsymbol a^\top\boldsymbol x]=\boldsymbol a^\top\Sigma\boldsymbol a=\lambda$ なので、最大固有値に対応する固有ベクトルが第1主成分を与える。
4. **2変数の相関行列**：$R=\begin{pmatrix}1&r\\r&1\end{pmatrix}$ の固有値は $1\pm r$、固有ベクトルは $(1,1)^\top/\sqrt2$ と $(1,-1)^\top/\sqrt2$。$r>0$ なら第1主成分は「和」、第2主成分は「差」。
5. 固有値の和は $\mathrm{tr}\,\Sigma=\sum_j\sigma_{jj}$（総分散）に等しい。相関行列なら $\sum\lambda_j=p$。

## 落とし穴

- **単位（尺度）の影響**：分散共分散行列に基づく主成分分析は、分散の大きい変数に引きずられる。単位の異なる変数を扱うときは標準化（相関行列に基づく主成分分析）を行う。両者の結果は一般に一致しない。
- **固有ベクトルの符号は任意**：$\boldsymbol a_k$ と $-\boldsymbol a_k$ はどちらも固有ベクトル。符号の向きで解釈を誤らないこと。
- **主成分数の決め方**：累積寄与率（例：70〜80%）、相関行列の固有値が1以上（カイザー基準）、スクリープロットの肘など、複数の基準を併用する。
- 主成分分析は分散を説明する次元削減であり、因子分析（観測されない共通因子のモデル）とは目的もモデルも異なる。
