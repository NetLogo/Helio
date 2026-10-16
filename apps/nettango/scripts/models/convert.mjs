import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { serializeProject } from "./extract.mjs";
import { formatOf, setRootVersion } from "./widgets.mjs";

export const TARGET_VERSION = "NetLogo 7.0.4";

const NETLOGO_HOME = process.env.NETLOGO_HOME ?? "/Applications/NetLogo 7.0.4";
const JAVA = process.env.JAVA ?? join(NETLOGO_HOME, "runtime/Contents/Home/bin/java");
const CONVERTER = fileURLToPath(new URL("./ConvertLegacy.java", import.meta.url));

/* The headless loader saves the legacy version string unchanged (ants came out as
   "NetLogo 6.2.0"), so stamp the version every other site model carries. */
export function withConvertedCode(project, nlogox) {
  if (formatOf(nlogox) !== "nlogox") throw new Error("converter output is not .nlogox");
  return { ...project, code: keepMarkerOffFirstLine(setRootVersion(nlogox, TARGET_VERSION)) };
}

/* The player skips replacing the block-generated section when the marker is the very
   first thing in <code>, so the dla and abstract-exponential players failed to compile. */
function keepMarkerOffFirstLine(nlogox) {
  return nlogox.replace(/(<code>(?:<!\[CDATA\[)?)(?=; --- NETTANGO BEGIN ---)/, "$1\n");
}

async function convertCode(code) {
  const directory = await mkdtemp(join(tmpdir(), "nettango-convert-"));
  try {
    const source = join(directory, "model.nlogo");
    const target = join(directory, "model.nlogox");
    await writeFile(source, code);
    await promisify(execFile)(
      JAVA,
      [
        "-Djava.awt.headless=true",
        `-Dnetlogo.extensions.dir=${join(NETLOGO_HOME, "extensions")}`,
        "-cp",
        join(NETLOGO_HOME, "app", "*"),
        CONVERTER,
        source,
        target,
      ],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    return await readFile(target, "utf8");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const [input] = process.argv.slice(2);
  if (!input) {
    console.error("usage: convert.mjs MODEL.ntjson");
    process.exit(2);
  }
  const project = JSON.parse(await readFile(input, "utf8"));
  if (formatOf(project.code) === "nlogox") {
    console.log(`${basename(input)}: already .nlogox, unchanged`);
  } else {
    const converted = withConvertedCode(project, await convertCode(project.code));
    await writeFile(input, serializeProject(converted));
    console.log(`${basename(input)}: converted to ${TARGET_VERSION} .nlogox`);
  }
}
