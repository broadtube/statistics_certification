# コンテンツ作成ガイド

`content/` 配下のファイルを追加・編集すると、ビルド時に自動で検証され、一覧・検索・演習に反映されます。
`npm run validate` で、ビルドせずに検証だけを実行できます。`npm run check:content` は、それに加えて要点・公式・問題の数式をすべて描画し、LaTeX の構文エラーも検出します。

## 著作権に関するルール（必ず守ること）

- **統計検定の過去問題の問題文・図表を転載しない。** 問題はすべてオリジナルで作成する。
- 過去問題を参考にした類題は `source: { kind: reference, exam: '2019年', question: '問5' }` のように年度と問番号だけを記録する（画面には「2019年 問5 類題」と表示される）。
- 教科書や Web サイトの文章をそのまま写さない。

## ファイルの種類

| 場所 | 内容 | ID |
| --- | --- | --- |
| `content/categories.yaml` | 大分類（表示順 `order`、模試の重み `mockWeight`） | `id` |
| `content/topics/{id}.md` | 分野の要点（フロントマター＋本文） | ファイル名 |
| `content/formulas/*.yaml` | 公式カード（1ファイルに複数可） | `id` |
| `content/problems/{分野}/{id}.yaml` | 問題（1ファイル1問） | ファイル名 |
| `content/distributions/{id}.yaml` | 分布カタログ | ファイル名 |

ID は英小文字・数字・ハイフンのみ。問題の ID はファイル名なので、**分野が違っても同じファイル名は使えない**（`ci-` などの分野ごとの接頭辞を付けるとよい）。URL と学習記録のキーを兼ねるため、**公開後は変更しない**。

## 分野（要点）

```markdown
---
title: 線形回帰
category: regression
order: 1
summary: 一覧に表示する概要
distributions: [normal, t, f]   # 任意
draft: false                    # true にすると本文なしで「準備中」と表示
---

## 定義
## 導出の流れ
## 落とし穴
```

- `## 定義`・`## 導出の流れ`・`## 落とし穴` は必須（`draft: true` のときは不要）。「主要公式」「関連問題」はページ側で自動生成される。
- 数式は `$...$`（インライン）と `$$...$$`（ディスプレイ）。
- 他のページへのリンクは `[[topic:linear-regression]]`、`[[formula:ols-matrix|表示名]]`、`[[dist:normal]]`。

## 問題

```yaml
topics: [linear-regression]       # 1つ以上（先頭が主分野）
formulas: [r-squared]             # 解説に表示する関連公式
difficulty: 2                     # 1〜3
type: numeric                     # numeric | choice
source: { kind: original }
statement: |
  $n={{n}}$、$p={{p}}$ のとき …
explanation: |
  … $={{answer}}$
params:                           # 類題用のパラメータ（範囲と刻み）
  n: { min: 15, max: 40, step: 5 }
  p: { min: 2, max: 5, step: 1 }
derived:                          # 中間値（宣言順に評価）
  df: n - p - 1
constraints: ['p < n']            # 真偽値の式
answer: 1 - (rss / (n - p - 1)) / (tss / (n - 1))
display: { digits: 3 }            # 正答・中間値の表示桁数（許容誤差の既定は半単位）
tolerance: { type: relative, value: 0.01 }   # 任意
variants: 20                      # 生成する類題数（既定 20、上限 50）
```

- `{{名前}}` で `params`・`derived`・`answer`・`choice_<id>` の値を差し込める。数式中では `\frac{ {{a}} }{ {{b}} }` のように中括弧の内側に空白を入れる。
- 式では四則演算・`sqrt`・`exp`・`log`・`abs`・`round`・`ceil` などと、統計関数 `pnorm` `qnorm` `pt` `qt` `pchisq` `qchisq` `pf` `qf` `dbinom` `pbinom` `dpois` `ppois` `choose` `gammafn` `betafn` が使える。
- $p$ 値や確率のように小さくなりうる答えは、表示桁数で「0.000」や有効数字1桁にならないよう `constraints` で範囲を絞る（例: `'1 - pchisq(x, k) >= 0.01'`）。`npm run check:content` はこれもエラーにする。
- ビルド時に類題を生成し、正答が計算できない・制約を満たせない・未定義の差し込み記号がある、といった誤りはビルドエラーになる。
- 選択式は `choices` に `id`（a〜e）・`text`・`correct` を書き、正答はちょうど1つ。`value` に式を書くと `{{choice_a}}` で値を差し込める（値が重複するとエラー）。
