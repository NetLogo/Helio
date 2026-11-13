import { defineSmokeSuite } from "@repo/vitest-config/helpers/smoke";
import { describe } from "vitest";

const HOST = process.env["E2E_HOST"] ?? "http://localhost:3003";

describe("smoke: nettango", async () => {
  await defineSmokeSuite(HOST, ["/"]);
});
