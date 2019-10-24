import fs from 'fs';
import { AccountInfo, InitialData } from './helper/types'; // 型情報
import download from './downloader'; // csvダウンロード

// コンソール及び、ログに残す
import leaveLog from './helper/trailer';

// Promiseのエラーがcatchされなかった場合
process.on('unhandledRejection', (reason: unknown): void => {
  if (typeof reason === 'string') {
    leaveLog(`${reason}`); // ログに残しておく
    console.log(`${reason}`);
  }
});

// 予期せぬエラー
process.on('uncaughtException', (err: Error): void => {
  process.stderr.write(err.message);
  process.abort();
});

/* メイン処理開始 */
leaveLog('----------');
leaveLog('メイン処理を開始します');

// init.jsonを読み込む
const conf: InitialData = JSON.parse(fs.readFileSync('./init.json', 'utf8'));

(async (): Promise<void> => {
  // 出金明細のjsonのパスを取得する
  const files = conf.users.map(
    async (x: AccountInfo): Promise<string> => download(x)
  );
  const result = await Promise.all(files);

  // ハイフンが含まれていた場合、異常終了する
  if (result.filter((x: string): boolean => x === '-').length > 0)
    process.exit(1);

  // 処理終了
  leaveLog('メイン処理が完了しました >> ' + result.join('-'));
})();
