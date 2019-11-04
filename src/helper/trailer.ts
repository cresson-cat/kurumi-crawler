import { SimpleLog } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const baseLog: SimpleLog = require('./logger');

// ログの型
type LogCurry = (msg: string) => void;

// JSのロガーをラップする（簡易的なカリー化）
const func = ((writeLog: SimpleLog): ((prefix?: string) => LogCurry) => {
  return (prfx?: string): LogCurry => {
    return (msg: string): void => {
      console.log(msg);
      writeLog(prfx || '', msg);
    };
  };
})(baseLog);

export default func;
