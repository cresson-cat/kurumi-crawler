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
