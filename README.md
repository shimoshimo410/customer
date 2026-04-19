# Mercari 購入者向けデジタル特典ビューアー

GitHub Pages にそのまま置ける構成です。
購入者は閲覧専用で、カード追加や PSA 追加は開発者側で JSON を更新して反映します。

## フォルダ構成

```text
mercari_bonus_viewer/
  index.html
  viewer.html
  data/
    items.json
    customers.json
  assets/
    css/site.css
    js/app.js
    js/index.js
    js/viewer.js
    images/
```

## 共有URLの例

一覧画面

```text
https://あなたのユーザー名.github.io/mercari_bonus_viewer/index.html?user=buyer-tanaka
```

個別画面

```text
https://あなたのユーザー名.github.io/mercari_bonus_viewer/viewer.html?user=buyer-tanaka&item=growlithe-psa-001
```

## 購入者を追加する方法

`data/customers.json` に 1 件追加します。

```json
{
  "id": "buyer-yamada",
  "displayName": "山田さま",
  "note": "2026-04-19 購入",
  "visibleItemIds": ["growlithe-raw-001"]
}
```

## カードや PSA を追加する方法

`data/items.json` に 1 件追加します。

```json
{
  "id": "new-card-001",
  "title": "カード名",
  "titleEn": "Card Name",
  "category": "raw",
  "cardLabel": "AR / 123/100 / 2026",
  "setName": "セット名",
  "description": "説明",
  "frontImage": "./assets/images/example_front.jpg",
  "backImage": "./assets/images/example_back.jpg",
  "sortOrder": 40,
  "tags": ["AR", "サンプル"]
}
```

PSA の場合は `category` を `psa` にします。

## GitHub Pages で公開する流れ

1. GitHub で新しいリポジトリを作成する
2. このフォルダ一式をアップロードする
3. GitHub の Settings → Pages を開く
4. Branch を `main` / Folder を `/root` にして保存する
5. 公開 URL が発行されたら、購入者ごとに `?user=...` を付けて共有する

## おすすめ運用

- 商品説明には「購入者限定デジタル展示特典あり」と書く
- 購入後にメルカリ取引メッセージで専用 URL を送る
- QR コード画像にして同梱してもよい
- 秘密性は強くないので、完全限定にしたい場合は将来的に Firebase などへ移行する

## 注意

この構成は静的サイトです。
購入者が自分でカードを追加する機能はありません。
編集は開発者側だけで行う想定です。
