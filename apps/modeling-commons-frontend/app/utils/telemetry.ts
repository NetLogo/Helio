const SPAN_URL_KEYS = ["url.full", "http.url"];

type SpanAttribute = { key: string; value?: { stringValue?: string | null } };

type SpanPayload = {
  attributes?: Record<string, unknown>;
  resourceSpans?: {
    scopeSpans?: { spans?: { attributes?: SpanAttribute[] }[] }[];
  }[];
};

export function scrubSpanUrls(payload: SpanPayload | undefined, scrub: (url: string) => string) {
  const attributes = payload?.attributes;
  if (attributes) {
    for (const key of SPAN_URL_KEYS) {
      const value = attributes[key];
      if (typeof value === "string") attributes[key] = scrub(value);
    }
  }

  for (const resourceSpan of payload?.resourceSpans ?? []) {
    for (const scopeSpan of resourceSpan.scopeSpans ?? []) {
      for (const span of scopeSpan.spans ?? []) {
        for (const attribute of span.attributes ?? []) {
          const { key, value } = attribute;
          if (SPAN_URL_KEYS.includes(key) && typeof value?.stringValue === "string") {
            value.stringValue = scrub(value.stringValue);
          }
        }
      }
    }
  }
}
