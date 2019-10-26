import { SimpleLog } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const writeLog: SimpleLog = require('./logger');

// メッセージを受け取るが、何も返さない
type RetNothing = (msg: string) => void;

/**
 * コンソール及びログにメッセージを出力する
 */
export default ((log: SimpleLog): RetNothing => {
  return (msg: string): void => {
    console.log(msg);
    log(msg);
  };
})(writeLog);
