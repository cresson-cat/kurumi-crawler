import fs from 'fs';
import download from './downloader'; // csvダウンロード

// コンソール及び、ログに残す
import logBuilder from './helper/trailer';
const leaveLog = logBuilder(); // メイン処理では`app.log`に書き込む

// Promiseのエラーがcatchされなかった場合
process.on('unhandledRejection', (reason: unknown): void => {
  if (typeof reason === 'string') {
    leaveLog(`${reason}`); // ログに残しておく
    process.exitCode = 1;
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
type CnfFileType = typeof import('../init.json'); // 型を取得
const conf: CnfFileType = JSON.parse(fs.readFileSync('./init.json', 'utf8'));

(async (): Promise<void> => {
  // 一旦直列に処理しとく。いずれ非同期に変更
  for (let user of conf.users) {
    const name = await download(user);
    if (name === '-') {
      leaveLog(
        `${user.name} の処理に失敗しました。詳細は個別ログを確認してください。`
      );
      process.exit(1);
    }
  }

  //#region 並列版..
  /*
  // 出金明細のjsonのパスを取得する
  const files = conf.users.map(
    async (x: AccountInfo): Promise<string> => download(x)
  );
  const result = await Promise.all(files);

  // ハイフンが含まれていた場合、異常終了する
  if (result.filter((x: string): boolean => x === '-').length > 0)
    process.exit(1);
  // */
  //#endregion

  // 処理終了
  leaveLog('メイン処理が完了しました');
})();
