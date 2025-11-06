# `custom-typescript-eslint` Custom Rules

## `custom-typescript-eslint/end-of-file-exports`
Ensures that once a file starts exporting symbols, no other top-level statements appear after those exports. By default the
rule checks both runtime exports (`export const`, `export default`, `export *`) and TypeScript-only exports (`export type`,
`export interface`).

### Options

```json
{
  "enforceNonTypeExports": true,
  "enforceTypeExports": true
}
```

- `enforceNonTypeExports` (default `true`): Validate value exports and `export default` statements.
- `enforceTypeExports` (default `true`): Validate type-only exports such as `export type` and `export interface`.

You can disable either option when a file needs to mix exports of that kind with other statements.

### Examples

```ts
// ❌ Violates enforceNonTypeExports
const answer = 42;
export { answer };
const extra = 99; // non-export statement after an export

// ❌ Violates enforceTypeExports
export type Config = { readonly port: number };
declare const runtimeConfig: Config; // non-export after a type export

// ✅ Allowed
const foo = 1;
const bar = 2;

export { foo, bar };
export type FooBar = { foo: number; bar: number };
```

### Configuration

```js
// eslint.config.mjs
export default [
  {
    rules: {
      "custom-typescript-eslint/end-of-file-exports": [
        "error",
        { enforceNonTypeExports: true, enforceTypeExports: true },
      ],
    },
  },
];
```

To allow additional statements after type exports while keeping the restriction for runtime exports, set
`{ enforceNonTypeExports: true, enforceTypeExports: false }`.
