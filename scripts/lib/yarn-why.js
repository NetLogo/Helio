/*
 * Runs `yarn why <pkg> --json` and returns the versions Yarn 1 reports.
 * Throws when the output cannot be read, so callers never mistake an
 * unparseable answer (for example Berry's different JSON) for "not installed".
 * */

const { spawnSync } = require("child_process");

const NOT_FOUND = "We couldn't find a match!";

function parseYarnWhy(stdout, stderr = "") {
  const versions = new Set();
  let notFound = false;

  /* stderr also carries Node deprecation warnings, which are not JSON. */
  const lines = [
    ...stdout.split("\n").filter((l) => l.trim()),
    ...stderr.split("\n").filter((l) => l.trim().startsWith("{")),
  ];
  const events = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`unparseable yarn why output: ${line.slice(0, 120)}`);
    }
  });

  for (const event of events) {
    if (event.type === "error") {
      if (event.data === NOT_FOUND) notFound = true;
      else throw new Error(`yarn why failed: ${event.data}`);
    }
    if (event.type !== "info" || typeof event.data !== "string") continue;
    const found = event.data.match(/Found "(.+)"/);
    if (!found) continue;
    const spec = found[1].slice(found[1].lastIndexOf("#") + 1);
    const at = spec.lastIndexOf("@");
    if (at <= 0) throw new Error(`unparseable yarn why entry: ${found[1]}`);
    versions.add(spec.slice(at + 1));
  }

  if (versions.size === 0 && !notFound) {
    throw new Error("yarn why printed neither a version nor a no-match error");
  }
  return [...versions];
}

function yarnWhy(pkg) {
  const result = spawnSync("yarn", ["why", pkg, "--json"], {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.error) throw new Error(`could not run yarn why: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`yarn why ${pkg} exited ${result.status}: ${(result.stderr || "").trim().slice(0, 300)}`);
  }
  return parseYarnWhy(result.stdout, result.stderr);
}

module.exports = { parseYarnWhy, yarnWhy };
