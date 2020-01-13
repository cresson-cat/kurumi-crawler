import { SimpleLog } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseLog: SimpleLog = require('./logger');

// カリー化途中の型
type Curry1st = (prefix: string) => (message: string) => void;
type Curry2nd = (message: string) => void;

// ロガー
const _func = (writeLog: SimpleLog): Curry1st => (prefix: string): Curry2nd => (
  message: string
): void => {
  console.log(message);
  writeLog(prefix, message);
};

/* カリー化された関数（以下）を順番に返す
 * -----
 * 1. ログファイル名を設定する関数
 * 2. ログにメッセージを出力する関数 */
export default _func(baseLog);
