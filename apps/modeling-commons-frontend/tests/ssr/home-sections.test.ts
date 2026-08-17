import { describe, expect, it } from "vitest";
import { homeFeedSections, homeRecentSection, homeSections } from "~~/shared/home";

describe("home section wiring", () => {
  it("gives every rendered section exactly one fetcher", () => {
    const fetchedByFeed = new Set(homeFeedSections.map((s) => s.key));
    const fetchedSeparately = new Set(homeSections.filter((s) => s.deferred).map((s) => s.key));

    for (const section of homeSections) {
      const inFeed = fetchedByFeed.has(section.key);
      const deferred = fetchedSeparately.has(section.key);
      expect(inFeed || deferred, `${section.key} is rendered but never fetched`).toBe(true);
      expect(inFeed && deferred, `${section.key} is fetched twice`).toBe(false);
    }
  });

  it("keeps recents out of the shared feed so its TTL does not apply", () => {
    expect(homeRecentSection.deferred).toBe(true);
    expect(homeFeedSections.map((s) => s.key)).not.toContain(homeRecentSection.key);
  });

  it("uses unique section keys", () => {
    const keys = homeSections.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
