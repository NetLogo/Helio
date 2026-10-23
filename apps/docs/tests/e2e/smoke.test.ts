import { defineSmokeSuite } from "@repo/vitest-config/helpers/smoke";
import { describe } from "vitest";

const HOST = process.env["E2E_HOST"] ?? "http://localhost:3001";

describe("smoke: docs", async () => {
  await defineSmokeSuite(
    HOST,
    ["/", "/matrix", "/arduino", "/programming", "/dictionary", "/versions"],
    // versions.json and announcements.json are published with the deployed site, so they are missing on dev and
    // preview servers, and the version selector logs its handled fetch failure.
    {
      allowedFailedRequests: [/\/versions\.json$/, /\/announcements\.json$/],
      allowedConsoleErrors: [/^Error fetching versions:/],
    },
  );
});
