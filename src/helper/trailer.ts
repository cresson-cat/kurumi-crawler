import { Logger } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const writeLog: Logger = require('./logger');

// メッセージを受け取るが、何も返さない
type RetNothing = (msg: string) => void;

/**
 * コンソール及びログにメッセージを出力する
 */
export default ((logger: Logger): RetNothing => {
  return (message: string): void => {
    console.log(message);
    logger(message);
  };
})(writeLog);
