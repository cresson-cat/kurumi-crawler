/**
 * 簡易ログ
 * @description `trailer.ts`でしか使わない
 */
export type SimpleLog = (prefix: string, message: string) => void;

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

/**
 * 配列を構成する個々の型を抽出（Union Types）
 */
export type TupleToUnion<T> = T extends (infer I)[] ? I : never;
