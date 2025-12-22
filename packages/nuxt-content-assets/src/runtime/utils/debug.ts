const label = "[content-assets]";

export function log(...data: Array<unknown>): void {
  console.info(label, ...data);
}

export function warn(...data: Array<unknown>): void {
  console.warn(label, ...data);
}

export function list(message: string, items: Array<string>): void {
  log(`${message}:\n\n${items.map((item) => `   - ${item}`).join("\n")}\n`);
}
