import { describe, expect, it } from "vitest";
import { scrubSpanUrls } from "~/utils/telemetry";

const stripQuery = (url: string) => url.split("?")[0] ?? url;

describe("scrubSpanUrls", () => {
  // Catches fetch span events sending ?token= to telemetry.
  it("scrubs url attributes on span events", () => {
    const payload = {
      attributes: {
        "url.full": "https://example.org/api/v1/unsubscribe?token=secret",
        "http.url": "https://example.org/reset?token=secret",
        "http.request.method": "GET",
      },
    };
    scrubSpanUrls(payload, stripQuery);
    expect(payload.attributes).toEqual({
      "url.full": "https://example.org/api/v1/unsubscribe",
      "http.url": "https://example.org/reset",
      "http.request.method": "GET",
    });
  });

  // Catches exported OTLP traces sending ?token= to telemetry.
  it("scrubs url attributes on exported trace spans", () => {
    const payload = {
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                {
                  attributes: [
                    { key: "url.full", value: { stringValue: "/api/v1/x?token=secret" } },
                    { key: "server.address", value: { stringValue: "example.org?keep" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    scrubSpanUrls(payload, stripQuery);
    expect(payload.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.attributes).toEqual([
      { key: "url.full", value: { stringValue: "/api/v1/x" } },
      { key: "server.address", value: { stringValue: "example.org?keep" } },
    ]);
  });

  // Catches overreaching scrubs and crashes on payloads without span data.
  it("leaves non-url attributes and empty payloads untouched", () => {
    const payload = { attributes: { name: "click?x=1" } };
    scrubSpanUrls(payload, stripQuery);
    expect(payload).toEqual({ attributes: { name: "click?x=1" } });
    expect(() => scrubSpanUrls(undefined, stripQuery)).not.toThrow();
  });
});
