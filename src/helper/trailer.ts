import { SimpleLog } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const writeLog: SimpleLog = require('./logger');

// ログの型
type LogCurry = (msg: string) => void;

// JSのロガーをラップする（簡易的なカリー化）
const func = ((log: SimpleLog): ((prefix?: string) => LogCurry) => {
  return (prfx?: string): LogCurry => {
    return (msg: string): void => {
      console.log(msg);
      log(prfx || '', msg);
    };
  };
})(writeLog);

export default func;
