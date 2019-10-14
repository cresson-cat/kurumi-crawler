/* Selenium */
import { Builder, By, WebDriver } from 'selenium-webdriver'; // webdriver

// 型情報
import { Logger, AccountInfo } from './helper/types';

import sleep from './helper/sleeper';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const writeLog: Logger = require('./helper/logger');

/**
 * ## Seleniumのセレクタの優先順位 ##
 * id > name > css selector
 * ※ あとで見直す..
 */

/**
 * USJのトップ画面からログイン画面へ遷移
 * @param _driver WebDriver
 */
const transFromTopToLogin = async (_driver: WebDriver): Promise<void> => {
  // トップ画面
  await _driver.get('https://direct.bk.mufg.jp/');
  await _driver.findElement(By.id('lnav_direct_login')).click();
  // ログイン画面（新規タブ）に切り替え
  const handles = await _driver.getAllWindowHandles();
  await _driver.switchTo().window(handles[handles.length - 1]);
};

/**
 * ログイン画面から個人のトップ画面へ遷移
 * @param _driver WebDriver
 */
const transFromLoginToIndiv = async (
  _driver: WebDriver,
  _user: AccountInfo
): Promise<void> => {
  await _driver.findElement(By.id('account_id')).sendKeys(_user.account);
  await _driver.findElement(By.id('ib_password')).sendKeys(_user.password);
  // ログインボタン押下
  await _driver
    .findElement(By.css('#login_frame > div > div > div.acenter.admb_m > a'))
    .click();
};

/**
 * 個人のトップ画面から入出金明細へ遷移
 * @param _driver WebDriver
 */
const transFromIndivToDetails = async (_driver: WebDriver): Promise<void> => {
  await _driver.findElement(By.css('#list > li:nth-child(2) > a')).click();
};

/**
 * 入出金明細にてCSVダウンロード
 * `最近10日` > `照会` > `明細をダウンロード` > `ダウンロード`
 * @param _driver WebDriver
 */
const downloadCsv = async (_driver: WebDriver): Promise<void> => {
  await _driver.findElement(By.id('day_ten')).click();
  await _driver
    .findElement(
      By.css('#search > div > div > div.item.last_item > div > button')
    )
    .click();
  await _driver
    .findElement(
      By.css(
        '#contents > div.yen_6_2_1 > div:nth-child(2) > div.data_footer > table > tbody > tr > td.first_child > a'
      )
    )
    .click();
  await _driver
    .findElement(By.css('#contents > div.buttons > div.admb_l > button'))
    .click();
};

/**
 * ログアウト
 * @param _driver WebDriver
 */
const logout = async (_driver: WebDriver): Promise<void> => {
  await _driver
    .findElement(By.css('#header > div.utilities > ul > li.logout > a'))
    .click();
};

/**
 * 出金CSVをダウンロードする
 * @param conf アカウント情報
 */
export default async function getCsv(user: AccountInfo): Promise<string> {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    // webdriverで、要素が生成されるまで一律30秒待機
    await driver.manage().setTimeouts({
      implicit: 30000,
      pageLoad: 30000,
      script: 30000,
    });

    /* ++ UFJトップ画面 >> ログイン画面 ++ */
    writeLog('　画面遷移中.. UFJトップ画面 >> ログイン画面');
    await transFromTopToLogin(driver);

    /* ++ ログイン画面 >> 個人用のトップ画面 ++ */
    writeLog('　画面遷移中.. ログイン画面 >> 個人用のトップ画面');
    await transFromLoginToIndiv(driver, user);

    /* ++ 個人のトップ画面 >> 入出金明細画面 ++ */
    writeLog('　画面遷移中.. 個人用のトップ画面 >> 入出金明細画面');
    await transFromIndivToDetails(driver);

    // `最近10日` > `照会` > （必要に応じて下にスライド） > `明細をダウンロード`
    writeLog('　CSVをダウンロード中..');
    await downloadCsv(driver);

    // 5秒待つ
    await sleep(5000);

    // ログアウト
    await logout(driver);

    return '';
  } catch (err) {
    // ログに残す
    console.log(err);
    writeLog(err);
    // エラー発生時は空文字を返す
    return '';
  } finally {
    driver.quit();
  }
}
