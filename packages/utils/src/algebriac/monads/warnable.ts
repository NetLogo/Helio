export type Warning = { message: string; line?: number };
export default class WarnableValue<A> {
  constructor(
    public obtainedValue: A,
    public warnings: Array<Warning> = []
  ) {}

  ap<B>(fab: WarnableValue<(a: A) => B>): WarnableValue<B> {
    return this.flatMap((a) => fab.map((f) => f(a)));
  }

  map<B>(f: (a: A) => B): WarnableValue<B> {
    return new WarnableValue(f(this.obtainedValue), this.warnings);
  }

  flatMap<B>(f: (a: A) => WarnableValue<B>): WarnableValue<B> {
    const next = f(this.obtainedValue);
    return new WarnableValue(next.obtainedValue, [
      ...this.warnings,
      ...next.warnings,
    ]);
  }

  merge<B, C>(other: WarnableValue<B>, f: (a: A, b: B) => C): WarnableValue<C> {
    return other.flatMap(
      (b) =>
        new WarnableValue(f(this.obtainedValue, b), [
          ...this.warnings,
          ...other.warnings,
        ])
    );
  }

  toString(): string {
    return `Value: ${this.obtainedValue}, Warnings: ${this.warnings
      .map((w) => w.message)
      .join('; ')}`;
  }

  throw() {
    throw new Error(
      `Cannot extract value due to warnings: ${this.warnings
        .map((w) => w.message)
        .join('; ')}`
    );
  }

  warn() {
    for (const w of this.warnings) {
      console.warn(`Warning: ${w.message}`);
    }
  }
}
