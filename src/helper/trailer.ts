import { curry } from 'ramda';
import { SimpleLog } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseLog: SimpleLog = require('./logger');

// ログの型
type LogCurry = (msg: string) => void;

// ロガー << カリー化予定
const _func = (writeLog: SimpleLog, prefix: string): LogCurry => {
  return (msg: string): void => {
    console.log(msg);
    writeLog(prefix || '', msg);
  };
};

// カリー化
const curried = curry(_func);

/* 1. プリフィックスを受け付ける
 * 2. メッセージを出力 */
export default curried(baseLog);
