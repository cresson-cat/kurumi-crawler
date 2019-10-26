# kurumi-crawler

## 予定

1. 本アプリをキックするための、シェルスクリプトを作成
   1. Githubリポジトリ作成 >> kurumi-client
   1. 以下の処理を実行する
      1. 本アプリをキック >> OK
      1. 前処理で作成したjsonを`curl`でPOST（とりあえず`json-server`へ） >> OK
      1. 失敗時は`slack`へ通知 >> `slack`への通知機能は、時間がある時に…
1. `Ramda`でリファクタリングする >> jsonのuploadまで作ったら、一旦こちらに注力
   1. `Ramda`のドキュメント調査
   1. ドキュメントを読む
   1. 実装

## メモ

1. init.json -> init.yaml >> 今度でいいや..
1. テストコードを追加 >> 気が向いたら
1. webpackでバンドルする >> 気が向いたら
