// 標準モジュール
import fs from 'fs';
import { promisify } from 'util';

// npmパッケージ
import {
  Builder,
  By,
  WebDriver /* , Capabilities */,
} from 'selenium-webdriver';
import { JSDOM } from 'jsdom';
import moment from 'moment';

// 型情報
import { AccountInfo, WithdrawalInfo } from './helper/types';

// コンソール及び、ログを残す
import leaveLog from './helper/trailer';

// 標準モジュールをPromise化しとく
const writeFile = promisify(fs.writeFile);

//#region chromeの設定
// 検討その１
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

// 検討その２
/*
const capabilities = Capabilities.chrome();
capabilities.set('chromeOptions', {
  args: ['--headless'],
});
*/
//#endregion

/**
 * USJのトップ画面からログイン画面へ遷移
 * @param driver WebDriver
 */
const transFromTopToLogin = async (driver: WebDriver): Promise<void> => {
  // トップ画面
  await driver.get('https://direct.bk.mufg.jp/');
  await driver.findElement(By.id('lnav_direct_login')).click();
  // ログイン画面（新規タブ）に切り替え
  const handles = await driver.getAllWindowHandles();
  await driver.switchTo().window(handles[handles.length - 1]);
};

/**
 * ログイン画面から個人のトップ画面へ遷移
 * @param driver WebDriver
 * @param user アカウント情報
 */
const transFromLoginToIndiv = async (
  driver: WebDriver,
  user: AccountInfo
): Promise<void> => {
  await driver.findElement(By.id('account_id')).sendKeys(user.account);
  await driver.findElement(By.id('ib_password')).sendKeys(user.password);
  // ログインボタン押下
  await driver
    .findElement(By.css('#login_frame > div > div > div.acenter.admb_m > a'))
    .click();
};

/**
 * 個人のトップ画面から入出金明細へ遷移
 * @param driver WebDriver
 */
const transFromIndivToDetails = async (driver: WebDriver): Promise<void> => {
  await driver.findElement(By.css('#list > li:nth-child(2) > a')).click();
};

/**
 * 入出金明細にてhtml取得
 * @param driver WebDriver
 */
const getHtml = async (driver: WebDriver): Promise<string> => {
  // 直近10日
  await driver.findElement(By.id('day_ten')).click();
  // 照会
  await driver
    .findElement(
      By.css('#search > div > div > div.item.last_item > div > button')
    )
    .click();

  // htmlを返す
  return driver.getPageSource();
  //#region CSVダウンロード。ダウンロード先を制御出来なかったのでコメント化
  /*
  await driver
    .findElement(
      By.css(
        '#contents > div.yen_6_2_1 > div:nth-child(2) > div.data_footer > table > tbody > tr > td.first_child > a'
      )
    )
    .click();
  await driver
    .findElement(By.css('#contents > div.buttons > div.admb_l > button'))
    .click();
  */
  //#endregion
};

/**
 * 入出金明細のtableをparseし、jsonを返す
 * @param html 分析対象のhtml
 * @param user アカウント情報
 */
const getJson = (html: string, user: AccountInfo): WithdrawalInfo[] => {
  let result: WithdrawalInfo[] = [];
  const dom = new JSDOM(html);

  /* +++ 小関数群 +++ */

  // tdのテキストを取得
  const _getText = (
    cell: HTMLTableDataCellElement,
    rIdx: number,
    isNullable = false
  ): string => {
    if (!cell.textContent && !isNullable)
      throw new Error(`${rIdx} 行目 ${cell.className} の値が取得できません`);
    return cell.textContent || '';
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
          _removeStr(_getText(td, rIdx), ['年', '月', '日'])
        );
      } else if (td.className.includes('manage') && isWithdrawals) {
        // -- 支払い金額 --
        isWithdrawals = false; // フラグを落とす
        const _txt = _removeStr(_getText(td, rIdx), [',', '円']).trim();
        if (!_txt) continue;
        // 支払い金が取得できた場合
        line.money = parseInt(_txt);
      } else if (
        td.className.includes('transaction') ||
        td.className.includes('note')
      ) {
        // -- 取引内容／メモ --
        const _txt = _getText(td, rIdx, true).trim();
        if (!line.description && _txt) {
          // 取引内容
          line.description = _txt;
        } else if (line.description && _txt) {
          // メモ
          line.description += `：${_txt}`;
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
 * @param driver WebDriver
 */
const logout = async (driver: WebDriver): Promise<void> => {
  await driver
    .findElement(By.css('#header > div.utilities > ul > li.logout > a'))
    .click();
};

/**
 * 出金情報をダウンロードする
 * @param user アカウント情報
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
    leaveLog(`　${user.name}：画面遷移中.. トップ画面 >> ログイン画面`);
    await transFromTopToLogin(driver);

    /* ++ ログイン画面 >> 個人用のトップ画面 ++ */
    leaveLog(`　${user.name}：画面遷移中.. ログイン画面 >> 個人用のトップ画面`);
    await transFromLoginToIndiv(driver, user);

    /* ++ 個人のトップ画面 >> 入出金明細画面 ++ */
    leaveLog(
      `　${user.name}：画面遷移中.. 個人用のトップ画面 >> 入出金明細画面`
    );
    await transFromIndivToDetails(driver);

    // htmlの取得
    leaveLog(`　${user.name}：htmlの取得中..`);
    const html = await getHtml(driver);

    // 出金明細のjson化
    leaveLog(`　${user.name}：出金明細のjson変換中..`);
    const json = getJson(html, user);

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
    leaveLog(err);

    // エラー発生時は、空文字を返す
    return '-';
  } finally {
    await driver.quit();
    //#region 順次閉じる
    /*
    const handles = await driver.getAllWindowHandles();
    handles.forEach(
      async (x: string): Promise<void> => {
        await driver.switchTo().window(x);
        driver.close();
      }
    );
    //*/
    //#endregion
  }
}
