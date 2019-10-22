// ライブラリ群
import { Builder, By, WebDriver } from 'selenium-webdriver'; // webdriver
import { JSDOM } from 'jsdom';
import fs from 'fs';
import moment from 'moment';
import { promisify } from 'util';

// Promise化
const writeFile = promisify(fs.writeFile);

// 型情報
import { Logger, AccountInfo, WithdrawalInfo } from './helper/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const writeLog: Logger = require('./helper/logger');

//#region chromeの設定.. 頑張っても効かなかったので、コメントアウト
/*
const capabilities = {
  browserName: 'chrome',
  chromeOptions: {
    prefs: {
      'download.default_directory': __dirname + '/../csv/',
    },
  },
};
*/
//#endregion

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
 * 入出金明細にてJson取得
 * @param _driver WebDriver
 * @param parse htmlのparse関数
 */
const getJson = async (_driver: WebDriver): Promise<string> => {
  // 直近10日
  await _driver.findElement(By.id('day_ten')).click();
  // 照会
  await _driver
    .findElement(
      By.css('#search > div > div > div.item.last_item > div > button')
    )
    .click();
  // htmlを返す
  return _driver.getPageSource();
  //#region CSVダウンロード。ダウンロード先を制御出来なかったのでコメント化
  /*
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
  */
  //#endregion
};

/**
 * 入出金明細のtableをparseして返す
 * @param html
 */
const parseWithdrawal = (html: string, user: AccountInfo): WithdrawalInfo[] => {
  let result: WithdrawalInfo[] = [];
  const dom = new JSDOM(html);
  // tdのテキストを取得
  const _getProp = (
    _cell: HTMLTableDataCellElement,
    rIdx: number,
    isNullable = false
  ): string => {
    if (!_cell.textContent && !isNullable)
      throw new Error(`${rIdx} 行目 ${_cell.className} の値が取得できません`);
    return _cell.textContent || '';
  };
  // 文字列を複数回削除する
  const _removeStr = (str: string, substrs: string[]): string => {
    let result = str;
    substrs.forEach((x: string): void => {
      result = result.replace(x, '');
    });
    return result;
  };

  /* +++ メイン処理 +++ */

  // tbodyを取得
  const content: HTMLTableSectionElement | null = dom.window.document.querySelector(
    '#contents > div.yen_6_2_1 > div:nth-child(2) > table > tbody'
  );
  // tbodyが取得できたかチェック
  if (!content)
    throw new Error(
      '出金明細が取得できません。html構造が変更された可能性があります'
    );
  // tbodyをparse
  for (let rIdx = 0; rIdx < content.rows.length; rIdx++) {
    let tr = content.rows[rIdx];
    // 各行の初期データ
    let line: WithdrawalInfo = {
      name: user.name,
      date: 0,
      branch: rIdx,
      money: 0,
      description: '',
    };
    // 出金用のフラグ
    let isWithdrawals = true;
    // データを分解する
    for (const td of tr.cells) {
      if (td.className.includes('date')) {
        // -- 日付 --
        line.date = parseInt(
          _removeStr(_getProp(td, rIdx), ['年', '月', '日'])
        );
      } else if (td.className.includes('manage') && isWithdrawals) {
        // -- 支払い金額 --
        const _money = _removeStr(_getProp(td, rIdx), [',', '円']).trim();
        if (!_money) continue;
        // 支払い金が取得できた場合
        line.money = parseInt(_money);
        isWithdrawals = false;
      } else if (
        td.className.includes('transaction') ||
        td.className.includes('note')
      ) {
        // -- 取引内容／メモ --
        const _prop = _getProp(td, rIdx, true).trim();
        if (!line.description && _prop) {
          // 取引内容
          line.description = _prop;
        } else if (line.description && _prop) {
          // メモ
          line.description += `：${_prop}`;
        }
      }
    }
    // 一行追加
    result.push(line);
  }
  // 結果返却
  return result;
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
 * 出金情報をダウンロードする
 * @param conf アカウント情報
 */
export default async function getWithdrawal(
  user: AccountInfo
): Promise<string> {
  const driver = await new Builder()
    .forBrowser('chrome') // .withCapabilities(capabilities)
    .build();

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

    // htmlの取得
    writeLog('　htmlの取得中..');
    const html = await getJson(driver);

    // 出金明細のjson化
    writeLog('　出金明細のjson変換中..');
    const json = parseWithdrawal(html, user);

    // jsonの書込み
    const fileName = `${user.name}_${moment().format('YYYYMMDD-HHmm')}.json`;
    await writeFile(
      // 出力先
      `./json/${fileName}`,
      // データの形式
      JSON.stringify(json, null, '  ')
    );

    // ログアウト
    await logout(driver);

    // ファイルパスを返却する
    return fileName;
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
