export function fetchHealth(signal: AbortSignal) {
  return useApi().GET("/api/health", { signal });
}
