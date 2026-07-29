declare const brand: unique symbol;

export type TransactionContext = {
  readonly [brand]: 'TransactionContext';
  onCommit: (task: () => Promise<void> | void) => void;
};

export interface TransactionManager {
  run: <T>(fn: (ctx: TransactionContext) => Promise<T>) => Promise<T>;
}
