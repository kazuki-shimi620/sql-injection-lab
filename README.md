# SQL Injection Lab

ブラウザ内のSQLiteでSQLインジェクションと認可の境界を学ぶ、日本語の学習ラボです。全34問、ヒント・解答・修正後の比較、カテゴリ選択・検索・進捗保存を含みます。

React / Python / WordPress / Djangoの処理は教材モデルです。各製品やCVEそのものを実行・再現するものではありません。参考事例の条件と公式出典は各問題に記載しています。

## テスト

Node.js 24で `npm ci` の後に `npm test` を実行します。実際のSQLite WASMとDOMテストで、全34問の通常入力・解答・防御、問題選択・検索・進捗を検証します。実ブラウザでの見た目や互換性の確認は別途必要です。

## 公開

GitHub PagesのSourceをGitHub Actionsに設定すると、mainへのpushでテスト後にdistを公開します。全アセットは相対パスで参照し、プロジェクト配下のURLに対応しています。

入力・教材DBはブラウザ内で処理し、外部へ送信しません。進捗のみlocalStorageへ保存します。

## 依存ソフトウェア

sql.js 1.13.0（MIT）。配布ライセンスは `dist/vendor/LICENSE.sqljs` に同梱しています。
