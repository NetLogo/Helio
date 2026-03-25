declare const brand: unique symbol;

export type TransactionContext = { readonly [brand]: 'TransactionContext' };

export interface TransactionManager {
  run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
