export const sizeToBytes = (size: number, unit: "B" | "KB" | "MB" | "GB"): number => {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
  };
  return size * (units[unit] || 1);
};
