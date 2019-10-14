/* eslint-disable @typescript-eslint/no-var-requires */

import fs from 'fs';
import { Logger, InitialData } from './helper/types'; // 型情報
import download from './downloader'; // csvダウンロード

// 自作の簡易ログ（js）
const writeLog: Logger = require('./helper/logger');

// Promiseのエラーがcatchされなかった場合
process.on('unhandledRejection', (reason: unknown): void => {
  if (typeof reason === 'string') {
    writeLog(`${reason}`); // ログに残しておく
    console.log(`${reason}`);
  }
});

// 予期せぬエラー
process.on('uncaughtException', (err: Error): void => {
  process.stderr.write(err.message);
  process.abort();
});

/* メイン処理開始 */
writeLog('----------');
writeLog('メイン処理を開始します');

// init.jsonを読み込む
const conf: InitialData = JSON.parse(fs.readFileSync('./init.json', 'utf8'));

(async (): Promise<void> => {
  await download(conf.users[0]);
  // conf.users.map にて、Promise(xN) を返す
  // downloaderをコールする
  // csvを取得する
  // csvからjsonに変換する
  // client にてjsonをPOSTする

  writeLog('メイン処理が完了しました');
})();
