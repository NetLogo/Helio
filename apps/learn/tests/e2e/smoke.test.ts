import { defineSmokeSuite } from "@repo/vitest-config/helpers/smoke";
import { describe } from "vitest";

const HOST = process.env["E2E_HOST"] ?? "http://localhost:3002";

describe("smoke: learn", async () => {
  await defineSmokeSuite(
    HOST,
    [
      "/",
      "/articles/first-11-netlogo-primitives-to-learn",
      "/resources",
      "/resources/IABM",
      "/resources/connected-chemistry",
      "/learning-paths",
      "/learning-paths/educators-novice",
    ],
    // announcements.json is published with the deployed site, so it is missing on dev and preview servers.
    { allowedFailedRequests: [/\/announcements\.json$/] },
  );
});
