# DAILY

スマートフォン中心の個人用減量管理PWA。React / TypeScript / Vite / Tailwind CSS / Recharts / Firebase。

## 起動

Node.js 22.12以降を推奨。

```sh
npm ci
npm run dev
```

表示されるローカルURLを開いてください。Firebase未設定時は「ローカルで使ってみる」から端末内保存で動作します。サンプルの健康記録は入っていません。ローカルデータは自動でGoogleアカウントには移行しません。必要ならJSONエクスポート後、ログイン先へインポートします。

## Firebaseの接続と公開

1. **SHIFTERとは別の新しいFirebaseプロジェクト**を作成します。
2. Webアプリを登録し、`.env.example`を`.env.local`にコピーしてWeb用Firebase設定を記入します。管理者秘密鍵は不要です。
3. AuthenticationでGoogleプロバイダーを有効にし、利用するドメインと開発用localhostを承認済みドメインに登録します。
4. Firestoreを本番モードで作成します。
5. 以下でルールとHostingをデプロイします。プロジェクトIDは毎回明示し、別アプリへの誤デプロイを防ぎます。

```sh
npx firebase login
npm run build
npx firebase deploy --only firestore:rules,hosting --project YOUR_NEW_PROJECT_ID
```

HTTPSの公開URLをスマートフォンで開き、ブラウザの「ホーム画面に追加」でインストールできます。iPhoneはSafariの共有メニューから追加します。

接続情報・アカウントが未提供のため、リポジトリ単体ではFirebase本番接続とHosting公開は完了しません。

## 機能

- ホーム / 履歴・分析 / 設定の3画面、ダークテーマ、モバイル下部ナビ
- 体重と4食の自動保存（900msデバウンスまたはフォーカス離脱）、前回差・7日平均・目標
- 実測 / 7暦日の移動平均、3測定未満は欠測、欠測の線は補間しない
- 7 / 30 / 90日、分析では30 / 90 / 180日 / 全期間
- 3状態スタンプ、週の移動、過去編集、服薬と生活習慣の別集計
- 月カレンダーから過去の体重・食事を編集。行動記録は週カードで編集
- 項目追加・改名・上下移動・無効化・論理削除。記録したセルに当時の名称を保持
- JSONの全記録エクスポートと検証・確認付き復元。既存データにマージし、同日の値は復元内容で更新
- Manifest / 192・512pxアイコン / 静的アセットのオフラインキャッシュ

アプリ名は`src/model.ts`の`APP_NAME`、`index.html`、`vite.config.ts`のManifestを変更します。

## 保存・同期

Firestoreは`users/{uid}/profile/settings`、`habits/{固定ID}`、`dailyRecords/{YYYY-MM-DD}`に保存します。日付はAsia/Tokyo基準。平均値は保存しません。ホームは30日と移動平均の補助期間のみ購読し、必要な過去期間を追加します。全期間とバックアップ操作時は全記録を取得します。同時に重複した履歴リスナーは作りません。

Firestore永続キャッシュを利用し、オフライン書き込みは通信復帰後に同期されます。「同期待ち」「保存済み」「保存失敗」を表示し、失敗した書き込みは画面の再試行から送信できます。同じ日の別項目は部分マージで更新し、同じ項目の競合はFirestoreの最終書き込み優先です。認証前に個人データのクエリは実行しません。

Service Workerはビルド済み静的アセットのみキャッシュします。認証通信やFirestore通信のランタイムキャッシュは行いません。Firestoreの端末内キャッシュはログアウト後もブラウザに残るため、個人専用端末で利用してください。健康データを消す場合はブラウザのサイトデータを削除してください。未同期のまま削除しないでください。

## 検証

```sh
npm run build
npm test
# Java 21以降が必要。実Firebaseに接続せずデモプロジェクトで検証
npm run test:rules
```

通常の`npm test`ではエミュレーター依存テストはスキップされます。`test:rules`で認証境界と入力検証を実行します。

クラウド認証・複数端末間の同期・実スマートフォンへのPWAインストールは、Firebase設定とHTTPS公開後に実環境で確認してください。

参考：[Firestoreオフライン同期](https://firebase.google.com/docs/firestore/manage-data/enable-offline)、[Security Rules](https://firebase.google.com/docs/firestore/security/get-started)。
