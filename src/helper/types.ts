/**
 * 簡易ログ
 */
export type Logger = (message: string) => void;

/**
 * アカウント情報
 */
export interface AccountInfo {
  name: string;
  account: string;
  password: string;
}

/**
 * 初期化データ
 */
export interface InitialData {
  users: AccountInfo[];
}

/**
 * Apiに渡す型。出金明細
 */
export interface WithdrawalInfo {
  name: string;
  date: number;
  branch: number;
  money: number;
  description?: string;
}
