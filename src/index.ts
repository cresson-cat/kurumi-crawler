/* eslint-disable @typescript-eslint/no-var-requires */

// 自作の簡易ログ（js）
type Logger = (message: string) => void;
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

// 以下実装中..
