export function subtractMs(date: Date, ms: number): Date {
  return new Date(date.getTime() - ms);
}
