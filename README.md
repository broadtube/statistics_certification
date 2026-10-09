# 準1級ラボ — 統計検定準1級 学習アプリ（非公式）

統計検定準1級の **要点・公式・確率分布・演習・模試・復習** を1つにまとめた静的 Web アプリです。
GitHub Pages などに置くだけで動き、学習記録はブラウザ内（localStorage）に保存されます。

> 本アプリは個人が作成した非公式の学習用アプリであり、統計検定の主催団体とは関係ありません。過去問題は転載していません。

## 主な機能

| 画面 | 内容 |
| --- | --- |
| ダッシュボード | 総解答数・正答率・今日の要復習数、分野別成績と弱点分野、模試の推移 |
| 分野マップ / 要点 | 7 大分類 37 分野。定義 → 主要公式 → 導出の流れ → 落とし穴 → 関連問題 |
| 公式チートシート / 暗記カード | 公式カードの検索・絞り込み、「あいまい」優先のフラッシュカード |
| 確率分布 | 19 分布の性質表と関係図、パラメータを動かせる PMF/PDF・CDF |
| 演習 / 復習 | 選択式・数値入力式（許容誤差判定）、数値違いの類題、誤答の間隔反復（1→3→7→14 日） |
| 模試 | 本番形式（30 問・120 分）/ ミニ模試。再読み込みしても残り時間と解答を保持 |
| 計算機 | 正規・t・χ²・F 分布の確率と分位点 |
| 学習記録の管理 | JSON でのエクスポート / インポート（置換・統合）、全消去 |

## 開発

```bash
npm ci
npm run dev          # 開発サーバー
npm test             # 単体・統合テスト（Vitest）
npm run validate     # コンテンツ検証（スキーマ・参照整合性・類題生成）
npm run build        # 検証 → ライセンス一覧生成 → 静的ビルド（dist/）
npm run test:e2e     # /stats-pre1/ 配下でビルドして E2E テスト（Playwright）
```

- Node.js 24 で動作確認しています。
- サブパスで公開する場合は `SITE_BASE=/リポジトリ名/ npm run build` のように指定します（GitHub Actions では自動設定）。
- E2E テストには Chromium の実行に必要なシステムライブラリが要ります。初回は `sudo npx playwright install-deps chromium` を実行してください。
- `src/vendor/stdlib.js` は `@stdlib` の分布関数をまとめた生成物です。依存を更新したら `npm run vendor` で再生成します。

## 公開（GitHub Pages）

1. GitHub にリポジトリを作成して push する
2. リポジトリの **Settings → Pages → Build and deployment** で Source を **GitHub Actions** にする
3. `main` に push すると `.github/workflows/deploy.yml` がテスト・検証・ビルドを行い、成功したときだけ公開する

## コンテンツの追加

コードを変更せずに、`content/` 配下のファイルを追加・編集するだけで反映されます。書き方は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 構成

```
content/        要点（Markdown）・公式・問題・分布（YAML）
build/          ビルド時の処理（読込・検証・Markdown 変換・類題生成・問題バンク出力）
src/pages/      静的ページと問題データ（JSON）の出力
src/islands/    操作が必要な画面（Preact）
src/lib/        判定・間隔反復・集計・出題計画・学習記録の保存など（UI 非依存）
tests/          unit / integration（Vitest）、e2e（Playwright）
.kiro/specs/    要件・設計・タスク
```
