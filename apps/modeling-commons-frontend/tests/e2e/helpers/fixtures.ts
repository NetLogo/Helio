import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export const sampleNlogoPath = resolve(here, "../../fixtures/sample.nlogo");
export const sampleNlogoxPath = resolve(here, "../../fixtures/sample.nlogox");
