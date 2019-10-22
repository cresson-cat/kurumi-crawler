/* eslint-disable @typescript-eslint/no-var-requires */

import fs from 'fs';
import { Logger, AccountInfo, InitialData } from './helper/types'; // 型情報
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
  // 出金明細のjsonのパスを取得する
  const files = conf.users.map(
    async (x: AccountInfo): Promise<string> => download(x)
  );
  const result = await Promise.all(files);
  // +++ テスト中 +++
  writeLog('メイン処理が完了しました >> ' + result);
})();
