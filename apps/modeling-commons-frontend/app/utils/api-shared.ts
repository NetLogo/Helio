import { CalendarDate } from "@internationalized/date";
export type DateInput = CalendarDate | Date | string | number | null | undefined;
export function createApiDateString(value: DateInput): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (value instanceof CalendarDate) {
    return value.toString();
  }

  const date = typeof value === "string" || typeof value === "number" ? new Date(value) : value;

  if (isNaN(date.getTime())) {
    console.warn(`Invalid date provided:`, date);
    return undefined;
  }

  const parts = date.toISOString().split("T");
  if (parts.length < 2) {
    console.warn(`Unexpected date format:`, date);
    return undefined;
  } else {
    return parts[0] as string;
  }
}

export type ApiDateRangeParams = {
  fromDate?: DateInput;
  toDate?: DateInput;
};

export type ApiPaginationParams = {
  page?: number;
  limit?: number;
};
