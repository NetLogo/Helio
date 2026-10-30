import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getSidebarBootScript,
  getSidebarStatePatch,
  LAST_SIDEBAR_SETTINGS_KEY,
  parseSidebarSettings,
  readSidebarSettings,
  resolveSidebarSettings,
  SIDEBAR_HIDDEN_ATTRIBUTE,
  SIDEBAR_RATIO_PROPERTY,
  getSidebarSettingsKey,
  writeSidebarSettings,
} from "../app/utils/sidebarSettings.ts";

const memoryStorage = (entries = {}) => {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  };
};

const blocked = () => {
  throw new Error("SecurityError");
};

// Catches a valid saved value being dropped on the next visit.
test("parseSidebarSettings reads what writeSidebarSettings stored", () => {
  const storage = memoryStorage();
  writeSidebarSettings(() => storage, "ants", { hidden: true, ratio: 31.5 });
  assert.deepEqual(parseSidebarSettings(storage.getItem(getSidebarSettingsKey("ants"))), {
    hidden: true,
    ratio: 31.5,
  });
});

// Catches a tampered or stale value reaching the layout.
test("parseSidebarSettings rejects anything that is not a hidden flag and a ratio", () => {
  const bad = [
    null,
    "",
    "not json",
    "null",
    "42",
    '{"hidden":"yes","ratio":30}',
    '{"hidden":true}',
    '{"hidden":true,"ratio":"30"}',
    '{"hidden":true,"ratio":0}',
    '{"hidden":true,"ratio":100}',
    '{"hidden":true,"ratio":-5}',
  ];
  for (const raw of bad) assert.equal(parseSidebarSettings(raw), undefined, String(raw));
});

// Catches settings saved before the rename to ratio being read as a share; Draft 4 accepts the reset instead.
test("parseSidebarSettings drops settings stored under the old width name", () => {
  assert.equal(parseSidebarSettings('{"hidden":true,"width":30}'), undefined);
});

// Catches the last used settings never being recorded, which breaks copying them to a new model.
test("writeSidebarSettings records the settings for the model and as the last used", () => {
  const storage = memoryStorage();
  writeSidebarSettings(() => storage, "fire", { hidden: false, ratio: 40 });
  assert.deepEqual(readSidebarSettings(() => storage, "fire"), {
    stored: { hidden: false, ratio: 40 },
    lastUsed: { hidden: false, ratio: 40 },
  });
  assert.deepEqual(readSidebarSettings(() => storage, "ants"), {
    stored: undefined,
    lastUsed: { hidden: false, ratio: 40 },
  });
});

// Catches a model whose id is "last" overwriting the last used settings.
test("getSidebarSettingsKey never collides with the last used key", () => {
  assert.notEqual(getSidebarSettingsKey("last"), LAST_SIDEBAR_SETTINGS_KEY);
});

// Catches blocked storage (private mode, sandboxed frames) crashing the model page.
test("reading and writing survive storage that throws", () => {
  assert.deepEqual(readSidebarSettings(blocked, "ants"), { stored: undefined, lastUsed: undefined });
  assert.doesNotThrow(() => writeSidebarSettings(blocked, "ants", { hidden: true, ratio: 30 }));
  const full = { getItem: () => null, setItem: blocked };
  assert.doesNotThrow(() => writeSidebarSettings(() => full, "ants", { hidden: true, ratio: 30 }));
});

const defaults = { hidden: false, ratio: 24 };

test("resolveSidebarSettings reopens a model with its own saved settings", () => {
  const stored = { hidden: true, ratio: 40 };
  assert.deepEqual(resolveSidebarSettings(stored, { hidden: false, ratio: 30 }, defaults), stored);
});

test("resolveSidebarSettings gives a new model the last hidden flag but the default ratio", () => {
  assert.deepEqual(resolveSidebarSettings(undefined, { hidden: true, ratio: 40 }, defaults), {
    hidden: true,
    ratio: 24,
  });
});

test("resolveSidebarSettings falls back to the defaults with no history", () => {
  assert.deepEqual(resolveSidebarSettings(undefined, undefined, defaults), defaults);
});

test("resolveSidebarSettings returns a copy the caller can change safely", () => {
  const stored = { hidden: false, ratio: 30 };
  const resolved = resolveSidebarSettings(stored, undefined, defaults);
  resolved.ratio = 50;
  assert.equal(stored.ratio, 30);
  const fromDefaults = resolveSidebarSettings(undefined, undefined, defaults);
  fromDefaults.hidden = true;
  assert.equal(defaults.hidden, false);
});

// Catches a desktop collapse no longer being remembered for the next visit.
test("getSidebarStatePatch saves a desktop collapse as hidden", () => {
  assert.deepEqual(getSidebarStatePatch(true, true), { hidden: true });
});

// Catches a desktop expand leaving the sidebar saved as hidden.
test("getSidebarStatePatch saves a desktop expand as shown", () => {
  assert.deepEqual(getSidebarStatePatch(false, true), { hidden: false });
  assert.deepEqual(getSidebarStatePatch("compact", true), { hidden: false });
});

// Catches closing the phone drawer saving hidden for the desktop and for every new model.
test("getSidebarStatePatch saves nothing on the stacked layout", () => {
  for (const state of [true, false, "compact"]) assert.equal(getSidebarStatePatch(state, false), undefined, String(state));
});

const fakeRoot = () => {
  const attributes = new Map();
  const properties = new Map();
  return {
    attributes,
    properties,
    setAttribute: (name, value) => attributes.set(name, value),
    style: { setProperty: (name, value) => properties.set(name, value) },
  };
};

const runBootScript = (modelId, localStorage) => {
  const root = fakeRoot();
  new Function("localStorage", "document", getSidebarBootScript(modelId))(localStorage, { documentElement: root });
  return { hidden: root.attributes.has(SIDEBAR_HIDDEN_ATTRIBUTE), ratio: root.properties.get(SIDEBAR_RATIO_PROPERTY) };
};

// Catches the first paint ignoring the model's own saved settings.
test("the boot script applies the model's saved hidden flag and ratio", () => {
  const storage = memoryStorage({ [getSidebarSettingsKey("ants")]: JSON.stringify({ hidden: true, ratio: 30 }) });
  assert.deepEqual(runBootScript("ants", storage), { hidden: true, ratio: "30%" });
});

// Catches the boot script disagreeing with resolveSidebarSettings, which gives a new model the default ratio.
test("the boot script carries only the hidden flag from the last used settings", () => {
  const storage = memoryStorage({ [LAST_SIDEBAR_SETTINGS_KEY]: JSON.stringify({ hidden: true, ratio: 50 }) });
  assert.deepEqual(runBootScript("ants", storage), { hidden: true, ratio: undefined });
});

// Catches the last used hidden flag overriding a model that was saved as shown.
test("the boot script lets the model's own entry win over the last used one", () => {
  const storage = memoryStorage({
    [getSidebarSettingsKey("ants")]: JSON.stringify({ hidden: false, ratio: 40 }),
    [LAST_SIDEBAR_SETTINGS_KEY]: JSON.stringify({ hidden: true, ratio: 50 }),
  });
  assert.deepEqual(runBootScript("ants", storage), { hidden: false, ratio: "40%" });
});

// Catches a tampered value or blocked storage breaking the page before it renders.
test("the boot script sets nothing for corrupt or unreadable storage", () => {
  const corrupt = memoryStorage({
    [getSidebarSettingsKey("ants")]: "not json",
    [LAST_SIDEBAR_SETTINGS_KEY]: JSON.stringify({ hidden: "yes", ratio: 30 }),
  });
  assert.deepEqual(runBootScript("ants", corrupt), { hidden: false, ratio: undefined });
  assert.deepEqual(runBootScript("ants", { getItem: blocked }), { hidden: false, ratio: undefined });
});

// Catches a model id with quotes escaping the script string.
test("the boot script reads the key of an id that needs escaping", () => {
  const id = 'a"b';
  const storage = memoryStorage({ [getSidebarSettingsKey(id)]: JSON.stringify({ hidden: true, ratio: 30 }) });
  assert.deepEqual(runBootScript(id, storage), { hidden: true, ratio: "30%" });
});

// Catches the boot script still reading the old width name.
test("the boot script ignores settings stored under the old width name", () => {
  const storage = memoryStorage({ [getSidebarSettingsKey("ants")]: JSON.stringify({ hidden: true, width: 30 }) });
  assert.deepEqual(runBootScript("ants", storage), { hidden: false, ratio: undefined });
});
