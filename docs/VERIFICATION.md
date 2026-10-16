# 検証記録

検証日：2026年10月17日（日本時間）。以下は実行して確認した結果です。

## 実データ

- 官公需情報ポータルの公式APIへHTTPSで接続し、実XMLを取得
- 新規Neon無料プランのPostgreSQLへマイグレーションを実行
- 初回同期：6リクエスト、取得932件、重複を除き883件保存、335機関
- 本番Vercel上の認証付き収集：02:06:43〜02:06:56、6リクエスト、取得695件、676件を保存・更新、API取得・保存エラー0件。返却上限のため`partial`
- 02:10確認時の蓄積総数：927件、344機関、資料リンクあり751件。分類はIT 343／Web 10／業務効率化19／AI 37／その他549（複数分類あり）
- VercelのプロジェクトAPIでCronの有効化と`0 21 * * *`・`/api/cron/sync`のProduction登録を確認。日本時間では毎日6時台
- APIヒット数が返却件数を超えた条件を`partial`として記録。API取得・保存エラー0件
- 200件の保存済みID取得、キーワード検索、添付資料・本文と原典URLを実DBで確認
- 自動判定による募集状況・資格不要・リモート可能表示は行わない

## 自動・操作検証

- `npm run lint`：成功
- `npm run typecheck`：成功
- `npm test`：5ファイル23テスト成功
- `npm run build`：成功
- Playwright：実DBの検索→Web分類→資料フィルター→詳細→元公告リンク→保存→再読込→プロフィール保存→関連スキル表示
- 空検索、存在しないIDの空結果、未認証Cronの401を確認
- 1440px PC／390pxスマートフォン／820pxタブレット／ダーク表示の横はみ出しなし
- 別ブラウザーコンテキストの保存データ分離、キーボードのスキップリンクを確認
- ブラウザー実行エラー0件
- axe-core：検索・詳細・プロフィール・保存・収集状況の5画面×明暗2テーマ、計10ケースで指定WCAG 2 A/AA・2.1 AAルールの自動検出違反0件
- 上記E2Eとaxe-coreは、ローカルに加え本番URLでも成功。本番でのE2E最終実行は02:12、ブラウザー実行エラー0件

自動検査は包括的なアクセシビリティ適合認証ではありません。実行レポートは開発環境の`.cache/`に保存し、秘密値の混入を避けるためリポジトリに含めません。

## 公開・画像・Secret Scan

- Production：[官公庁案件検索](https://public-procurement-search.vercel.app)。登録不要のブラウザーでアクセスでき、ヘルスチェックHTTP 200、実DB 927件を確認
- アプリソース`eae04b7`のVercelビルド成功、Production `READY`と本番ドメインへの割り当てを確認
- 公開コード：[shunsoco-stack/public-procurement-search](https://github.com/shunsoco-stack/public-procurement-search)。GitHub上の`Public`表示を確認
- 本番画面から実際に操作して撮影した5枚を`docs/screenshots/`へ保存し、READMEへ埋め込み（画像コミット`19b561c`）
- GitHubのREADMEを未ログインのブラウザーで開き直し、5枚すべて`complete: true`、実画像サイズ1440×1080が4枚・390×844が1枚として読み込まれることを確認。ローカル画像も目視確認
- 公式配布・SHA-256検証済みGitleaks v8.30.1で、ステージ済み差分および公開Git履歴をredact付き検査：秘密値の検出0件
- [アプリソースのGitHub Actions](https://github.com/shunsoco-stack/public-procurement-search/actions/runs/38937646364)：lint・型検査・23単体テスト・Productionビルド・履歴Secret Scanが成功
- [画像・検証スクリプト更新後のGitHub Actions](https://github.com/shunsoco-stack/public-procurement-search/actions/runs/38938029689)も成功
- DB接続文字列・Cron秘密値はGitへ登録せず、Vercelの環境変数を使用

GitHub Actionsは検証用です。本番更新はREADME記載のVercel CLIで実行します。

## 掲載準備

- `PORTFOLIO_INTEGRATION_PROMPT.md`：既存ポートフォリオへ追加するためのプロンプトを用意
- `TSUKUTTA_SUBMISSION.md`：紹介文、特徴、URL、タグ候補、画像5枚の順序を用意
- ポートフォリオ自体の編集・Tsukuttaへの投稿は行っていません

全国全件の取得完了、募集中の保証、資格審査、受注適性のスコアは提供しません。分類と本文からの根拠候補は、公式公告・仕様書と照合する補助情報です。
