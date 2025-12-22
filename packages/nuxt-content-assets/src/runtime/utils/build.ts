/**
 * Build a style string by passing multiple independent expressions
 */
export function buildStyle(...expr: Array<string>): string {
  return (
    expr
      .map((expr) => expr.replace(/^[; ]+|[; ]+$/g, ""))
      .filter((s) => s)
      .join(";")
      .replace(/\s*;\s*/g, "; ") + ";"
  );
}

/**
 * Build a query string by passing multiple independent expressions
 */
export function buildQuery(...expr: Array<string>): string {
  const output = expr.map((expr) => expr.replace(/^[?&]+|&+$/g, "")).filter((s) => s);
  if (output.length) {
    const [first, ...rest] = output;
    const isParam = (expr: string | undefined): Boolean =>
      Boolean(expr) && /^[^?]+=[^=]+$/.test(expr as string);
    return !isParam(first)
      ? rest.length > 0
        ? first + ((first as string).includes("?") ? "&" : "?") + rest.join("&")
        : (first as string)
      : "?" + output.join("&");
  }
  return "";
}
