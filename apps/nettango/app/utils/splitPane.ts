export const SPLIT_BOUNDS = { min: 20, max: 80 } as const;
export const SPLIT_QUERY_BOUNDS = { min: 30, max: 70 } as const;
export const SPLIT_STEP = 2;

const getFirstValue = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

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

export const getRatioFromPointer = (x: number, left: number, width: number, reversed = false): number => {
  const fromLeft = ((x - left) / width) * 100;
  return reversed ? 100 - fromLeft : fromLeft;
};

// Dragging the divider halfway past the start pane's minimum reads as a request to close it.
export const shouldCollapseStart = (pointerRatio: number, width: number, minStart: number): boolean =>
  width > 0 && (pointerRatio / 100) * width < minStart / 2;

export const getRatioForKey = (ratio: number, key: string, reversed = false): number | undefined => {
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

export const parseSplitQuery = (value: unknown): number | undefined => {
  const raw = getFirstValue(value);
  if (typeof raw !== "string" || !/^\d{1,3}$/.test(raw)) return undefined;
  const ratio = Number(raw);
  return ratio >= SPLIT_QUERY_BOUNDS.min && ratio <= SPLIT_QUERY_BOUNDS.max ? ratio : undefined;
};
