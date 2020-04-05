// 標準モジュール
import fs from 'fs';
import { promisify } from 'util';

// npmパッケージ
import { Builder, By, WebDriver, Capabilities } from 'selenium-webdriver';
import { JSDOM } from 'jsdom';
import moment from 'moment';

// 自作のモジュール
import { WithdrawalInfo, TupleToUnion } from './helper/types';
import logBuilder from './helper/trailer';

// `users`の個々の型を取得
type Accounts = (typeof import('../init.json'))['users'];
type AccountType = TupleToUnion<Accounts>;

// 標準モジュールをPromise化しとく
const writeFile = promisify(fs.writeFile);

// headlessモードにする
const capabilities = Capabilities.chrome();
capabilities.set('goog:chromeOptions', {
  args: ['--headless'],
});

/**
 * USJのトップ画面からログイン画面へ遷移
 * @param driver WebDriver
 */
const transFromTopToLogin = async (driver: WebDriver): Promise<void> => {
  // トップ画面
  await driver.get('https://direct.bk.mufg.jp/');
  // htmlの構造的にseleniumからクリック出来ない。javascriptを使う
  const _func = (selector: string): void => {
    // なぜか、1html内に同一のidが振られているので、2件めをクリック
    let button = document.querySelectorAll(selector)[1] as HTMLElement;
    button.click();
  };
  await driver.executeScript(_func, '#lnav_direct_login');
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
  user: AccountType
): Promise<void> => {
  await driver.findElement(By.id('tx-contract-number')).sendKeys(user.account);
  await driver.findElement(By.id('tx-ib-password')).sendKeys(user.password);
  // ログインボタン押下
  await driver
    .findElement(
      By.css(
        'body > div.body-wrap > main > form > section > div > div > div.form-area-form > div.bottom-nav > div > button'
      )
    )
    .click();
};

/**
 * 個人のトップ画面から入出金明細へ遷移
 * @param driver WebDriver
 */
const transFromIndivToDetails = async (driver: WebDriver): Promise<void> => {
  await driver
    .findElement(
      By.xpath(
        '/html/body/div/main/form/section/div/div[1]/div/div[2]/section[1]/a'
      )
    )
    .click();
};

/**
 * 入出金明細にてhtml取得
 * @param driver WebDriver
 */
const getHtml = async (driver: WebDriver): Promise<string> => {
  // 直近10日
  // await driver.findElement(By.id('day_ten')).click();
  // 照会
  await driver
    .findElement(
      By.css('#search > div > div > div.item.last_item > div > button')
    )
    .click();

  // htmlを返す
  return driver.getPageSource();
};

/**
 * 入出金明細のtableをparseし、jsonを返す
 * @param html 分析対象のhtml
 * @param user アカウント情報
 */
const getJson = (html: string, user: AccountType): WithdrawalInfo[] => {
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
  // 年月日を`YYYYMMDD`形式に整形する
  const _formatYMD = (txt: string): string => {
    const parts = txt.split(/年|月|日/, 3);
    // 年月日を持たない場合は、そのまま返す
    if (parts.length < 3) return txt;
    parts[1] = parts[1].padStart(2, '0');
    parts[2] = parts[2].padStart(2, '0');
    return parts.join('');
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
  // 変数群
  let currDate: number;
  let pastDate = 0;
  let bnum = 0; // 枝番
  // tbodyをparse
  for (let rI = 0; rI < content.rows.length; rI++) {
    let tr = content.rows[rI];
    // 各行の初期データ
    let line: WithdrawalInfo = {
      name: user.name,
      date: 0,
      branch: 0,
      money: 0,
      description: '',
    };
    // 出金用のフラグ
    let isWithdrawals = true;
    // データを分解する
    for (const td of tr.cells) {
      if (td.className.includes('date')) {
        // -- 日付 --
        currDate = parseInt(_formatYMD(_getText(td, rI)));
        // 同一の日付の場合はインクリメント
        bnum = pastDate === currDate ? ++bnum : (bnum = 0);
        // 現在日付を退避
        if (pastDate !== currDate) pastDate = currDate;
        // 日付と連番を設定
        line.date = currDate;
        line.branch = bnum;
      } else if (td.className.includes('manage') && isWithdrawals) {
        // -- 支払い金額 --
        isWithdrawals = false; // フラグを落とす
        const _txt = _removeStr(_getText(td, rI), [',', '円']).trim();
        if (!_txt) continue;
        // 支払い金が取得できた場合
        line.money = parseInt(_txt);
      } else if (
        td.className.includes('transaction') ||
        td.className.includes('note')
      ) {
        // -- 取引内容／メモ --
        const _txt = _getText(td, rI, true).trim();
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
  user: AccountType
): Promise<string> {
  const driver = await new Builder()
    .withCapabilities(capabilities)
    .forBrowser('chrome')
    .build();

  // ログ出力の準備
  const leaveLog = logBuilder(user.name);

  try {
    // webdriverで、要素が生成されるまで一律30秒待機
    await driver.manage().setTimeouts({
      implicit: 300000,
      pageLoad: 300000,
      script: 300000,
    });

    /* ++ UFJトップ画面 >> ログイン画面 ++ */
    leaveLog(`${user.name}：画面遷移中.. トップ画面 >> ログイン画面`);
    await transFromTopToLogin(driver);

    /* ++ ログイン画面 >> 個人用のトップ画面 ++ */
    leaveLog(`${user.name}：画面遷移中.. ログイン画面 >> 個人用のトップ画面`);
    await transFromLoginToIndiv(driver, user);

    /* ++ 個人のトップ画面 >> 入出金明細画面 ++ */
    leaveLog(`${user.name}：画面遷移中.. 個人用のトップ画面 >> 入出金明細画面`);
    await transFromIndivToDetails(driver);

    // htmlの取得
    leaveLog(`${user.name}：htmlの取得中..`);
    const html = await getHtml(driver);

    // 出金明細のjson化
    leaveLog(`${user.name}：出金明細のjson変換中..`);
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
    leaveLog(err);
    // エラー発生時は、空文字を返す
    return '-';
  } finally {
    // `quit`は一度しか呼べない。追々並列で呼べるように変更
    await driver.quit();
  }
}
