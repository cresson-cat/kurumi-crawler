/**
 * sleep
 * @param sec 待機ミリ秒
 */
export default function sleep(waitSec: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout((): void => resolve(), waitSec);
  });
}
