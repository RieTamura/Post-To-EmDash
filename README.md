# Post To EmDash - Obsidian プラグイン

言語：**日本語** | [English](./README_EN.md)

Obsidian で書いたノートを、[EmDash](https://github.com/emdash-cms/emdash) のサイトにブログ記事として投稿するプラグインです。

> **作っている途中です。** いまは設定画面とコマンドだけがあり、まだ投稿はできません。計画は [docs/plan-obsidian-to-emdash.md](./docs/plan-obsidian-to-emdash.md) にあります。

## できるようになること（予定）

- 今開いているノートを、コマンドかリボンのボタンで EmDash に送る
- 下書きで送る（frontmatter に `status: publish` と書いたときだけすぐ公開）
- 画像・カテゴリー・タグ・抜粋・アイキャッチも一緒に送る
- 一度送ったノートをもう一度送ると、同じ記事が更新される

## 設定

| 設定 | 内容 |
| --- | --- |
| サイトの URL | EmDash のサイトの URL |
| アクセストークン | EmDash の管理画面「APIトークン」で作ったトークン（`ec_pat_…`）。権限は `content:read`・`content:write`・`media:write` の3つ |
| 画像をアップロードする | ノートの画像を EmDash に送るかどうか |
| タイムアウト | 通信を待つ時間（ミリ秒） |

トークンは Obsidian のキーチェーンに保存されます。プラグインの設定ファイル（`data.json`）には書かれないので、保管庫を同期しても広がりません。キーチェーンは端末ごとなので、パソコンとスマホでそれぞれ入力してください。

## 開発

```bash
npm install
npm run dev     # 変更を見張ってビルド
npm run build   # 本番用ビルド（main.js）
npm run lint
```

`main.js`・`manifest.json`・`styles.css` を保管庫の `.obsidian/plugins/post-to-emdash/` に置くと読み込めます。

## ライセンス

[0BSD](./LICENSE)
