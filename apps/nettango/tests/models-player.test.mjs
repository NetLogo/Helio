import assert from "node:assert/strict";
import { test } from "node:test";

import { TARGET_VERSION, withConvertedCode } from "../scripts/models/convert.mjs";
import { extractProject } from "../scripts/models/extract.mjs";
import { makePlayer, newStorageId, takenStorageIds } from "../scripts/models/make-player.mjs";

const player = (id, project) =>
  `<html><script>var jsRoutes = {};</script><script type="text/json" id="${id}">${JSON.stringify(project)}</script><script>start()</script></html>`;

const PROJECT = {
  title: "Fire",
  code: '<model version="NetLogo 7.0.4"/>',
  spaces: [{ name: "Go" }],
};

test("extractProject reads both tag ids and splits off storageId", () => {
  // Catches older ntango-code players being skipped or storageId leaking into the ntjson.
  for (const id of ["nettango-code", "ntango-code"]) {
    const { project, storageId } = extractProject(
      player(id, { ...PROJECT, storageId: "ntb-0123456789" }),
    );
    assert.deepEqual(project, PROJECT);
    assert.equal(storageId, "ntb-0123456789");
  }
  assert.throws(() => extractProject("<html></html>"), /no nettango-code/);
});

test("makePlayer changes only the code tag, appending the storageId last", () => {
  // Catches template bytes outside the tag changing, or a key order the player export would not write.
  const template = player("nettango-code", { title: "Template", storageId: "ntb-1111111111" });
  const out = makePlayer(template, PROJECT, "ntb-2222222222");
  assert.equal(out, player("nettango-code", { ...PROJECT, storageId: "ntb-2222222222" }));
});

test("makePlayer refuses an old template, a stored storageId and a closing script tag", () => {
  // Each catches a player that would load the wrong saved progress or break the page.
  const template = player("nettango-code", { title: "Template" });
  assert.throws(
    () => makePlayer(player("ntango-code", {}), PROJECT, "ntb-1"),
    /old ntango-code tag/,
  );
  assert.throws(
    () => makePlayer(template, { ...PROJECT, storageId: "x" }, "ntb-1"),
    /already carries/,
  );
  assert.throws(
    () => makePlayer(template, { ...PROJECT, title: "</script>" }, "ntb-1"),
    /<\/script/,
  );
});

test("newStorageId skips ids already used by other players", () => {
  // Catches two players sharing a localStorage key for saved progress.
  const taken = takenStorageIds([player("nettango-code", { storageId: "ntb-0000000000" })]);
  assert.deepEqual([...taken], ["ntb-0000000000"]);
  const digits = [...Array(10).fill(0), ...Array(10).fill(7)];
  assert.equal(
    newStorageId(taken, () => digits.shift()),
    "ntb-7777777777",
  );
});

test("withConvertedCode stamps the target version and rejects non-nlogox output", () => {
  // Catches a converted model keeping its 6.x version or a failed conversion overwriting the code.
  const converted = withConvertedCode(
    PROJECT,
    '<?xml version="1.0"?><model version="NetLogo 6.2.0"><widgets/></model>',
  );
  assert.equal(
    converted.code,
    `<?xml version="1.0"?><model version="${TARGET_VERSION}"><widgets/></model>`,
  );
  assert.equal(converted.title, "Fire");
  assert.throws(() => withConvertedCode(PROJECT, "to go end\n@#$#@#$#@"), /not \.nlogox/);
});

test("withConvertedCode keeps the NetTango marker off the first code line", () => {
  // Catches the marker landing right after <code>, which made the player skip the generated section.
  for (const open of ["<code>", "<code><![CDATA["]) {
    const converted = withConvertedCode(
      PROJECT,
      `<?xml version="1.0"?><model version="NetLogo 6.2.0">${open}; --- NETTANGO BEGIN ---\nto go end</code></model>`,
    );
    assert.ok(converted.code.includes(`${open}\n; --- NETTANGO BEGIN ---`), open);
  }
});
