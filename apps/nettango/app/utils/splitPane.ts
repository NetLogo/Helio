export const SPLIT_BOUNDS = { min: 20, max: 80 } as const;
export const SPLIT_QUERY_BOUNDS = { min: 30, max: 70 } as const;
export const SPLIT_STEP = 2;

const firstValue = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

const round = (value: number): number => Math.round(value * 10) / 10;

export const clampRatio = (ratio: number, width = 0, minStart = 0, minEnd = 0): number => {
  let low: number = SPLIT_BOUNDS.min;
  let high: number = SPLIT_BOUNDS.max;
  if (width > 0) {
    low = Math.max(low, (minStart / width) * 100);
    high = Math.min(high, 100 - (minEnd / width) * 100);
  }
  // Too narrow for both minimums: share the shortfall instead of starving one pane.
  if (low > high) return round((low + high) / 2);
  return round(Math.min(high, Math.max(low, ratio)));
};

export const ratioFromPointer = (x: number, left: number, width: number, reversed = false): number => {
  const fromLeft = ((x - left) / width) * 100;
  return reversed ? 100 - fromLeft : fromLeft;
};

export const ratioForKey = (ratio: number, key: string, reversed = false): number | undefined => {
  const step = reversed ? -SPLIT_STEP : SPLIT_STEP;
  switch (key) {
    case "ArrowLeft":
      return ratio - step;
    case "ArrowRight":
      return ratio + step;
    case "Home":
      return SPLIT_BOUNDS.min;
    case "End":
      return SPLIT_BOUNDS.max;
    default:
      return undefined;
  }
};

export const splitFromQuery = (value: unknown): number | undefined => {
  const raw = firstValue(value);
  if (typeof raw !== "string" || !/^\d{1,3}$/.test(raw)) return undefined;
  const ratio = Number(raw);
  return ratio >= SPLIT_QUERY_BOUNDS.min && ratio <= SPLIT_QUERY_BOUNDS.max ? ratio : undefined;
};

export const parseStoredRatio = (raw: string | null): number | undefined => {
  if (raw === null || !/^\d{1,2}(\.\d)?$/.test(raw)) return undefined;
  const ratio = Number(raw);
  return ratio >= SPLIT_BOUNDS.min && ratio <= SPLIT_BOUNDS.max ? ratio : undefined;
};

export const resolveInitialRatio = (
  explicit: number | undefined,
  stored: string | null,
  fallback: number,
): number => explicit ?? parseStoredRatio(stored) ?? fallback;

export const splitCssVar = (storageKey: string): string =>
  `--nt-split-${storageKey.replace(/[^a-z0-9-]/gi, "")}`;

export const splitStorageId = (storageKey: string): string => `nt-split:${storageKey}`;

// Runs in <head> before first paint so SSR markup that reads the variable lays out at the saved ratio.
export const splitBootScript = (storageKey: string): string =>
  `try{var v=localStorage.getItem(${JSON.stringify(splitStorageId(storageKey))});` +
  `if(/^\\d{1,2}(\\.\\d)?$/.test(v)&&v>=${SPLIT_BOUNDS.min}&&${SPLIT_BOUNDS.max}>=v)` +
  `document.documentElement.style.setProperty(${JSON.stringify(splitCssVar(storageKey))},v+"%")}catch(e){}`;
