# DAILY / Personal Observation Terminal

## 参照

ユーザー提供 `SHIFTER_TIPS_HANDOFF.zip`、reference/index.html、Site version 43、commit `6248f7a3ef9deaef8498970673f20907dea26f7e`。同梱検証スクリプトで11ファイルのハッシュ一致を確認。

SHIFTER移植・TIPS・管理者権限・iframeの指示は対象外。採用したのは以下の視覚的な手法です。

- `paintCabin` のseed=4193の固定乱数、約5pxごとの微小な線の揺らぎ、二重枠、ネジ、配線、計器の細線。
- 固定された塗装剥がれ。模様自体を点滅させず、パネルの外周に限定。
- 文字と発光を別に扱う構成。入力・本文は通常のHTMLで残し、主数値のtext-shadowとグラフの小さな影だけに発光を限定。
- 黒・チャコール・生成りの構成。達成スタンプだけに淡いグリーンを使用。

## 実装

`src/InstrumentPanel.tsx` は既存sectionのラッパー。装飾CanvasはResizeObserverでサイズが変わったときだけ描画。最大辺2048px、DPR最大1.5。常時描画ループはありません。document.hidden中は描画を見送り、表示復帰時に必要なら描き直します。イベント・Observer・予約フレームはアンマウント時に解除。

`public/hull-instruments.svg` と `public/console-rail.svg` は同じ線・計器の表現を静的アセットにしたもの。`node scripts/build-hull-art.mjs` で生成できます。背景は固定サイズで反復し、表示比率に合わせた引き伸ばしは行いません。生成AI・宇宙写真・星空壁紙は使用していません。

起動とヘッダー切替は短いopacity/Y移動、スタンプは240msの押下、グラフは450msのopacityだけです。常時の演出は状態ランプの弱い揺らぎだけ。入力は動かしません。prefers-reduced-motionですべてのアニメーションと遷移を停止。バックグラウンドでもアニメーションを一時停止。

横スワイプは移動量65px以上、縦の移動量の2倍以上で週を切替。縦スクロール・複数ポインター・キャンセル・操作ボタンの領域を区別します。表内では横スクロールを優先し、境界に到達していて実際のスクロールが起きなかった場合だけ週切替。10pxを超えるドラッグではスタンプを切り替えません。矢印と今日へ戻る操作も維持。

## フォント

同梱WOFFから使用文字を抽出してWOFF2化。ライセンス・著作権表示は `public/fonts/*.txt` に保持。

| 書体 | 用途 | バイト数 |
|---|---|---:|
| Zen Kaku Gothic New Black | 見出し | 41,172 |
| Dela Gothic One | 主数値・ロゴ | 5,928 |
| Yomogi | 短い手書きの補助文 | 6,608 |

合計53,708バイト。本文、入力、動的な項目名はシステムフォント。サブセットにない文字はフォールバック。font-display:swapで表示を止めません。全書体の先読みはせず、表示された要素に必要な書体を読み込みます。

## 保護したコード

`src/model.ts`、`src/useStore.ts`、`src/firebase.ts`、`firestore.rules`、`firebase.json`、`vite.config.ts`、`package.json`、`package-lock.json`は今回変更していません。認証・通信・保存・データモデル・平均計算・バックアップ・PWA設定は維持。UIの目標差分は表示時の引き算だけで保存しません。追加のFirestoreアクセスはありません。

## 検証

詳細は `design-qa.md`。通常利用URLは http://127.0.0.1:5173/ 、テスト用の別オリジン http://127.0.0.1:5175/ だけに合成データをインポートして操作検証しました。既存の健康データの初期化・削除・書き換えはしていません。
