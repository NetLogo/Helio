export type SidebarSettings = {
  hidden: boolean;
  ratio: number;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const DEFAULT_SIDEBAR_SETTINGS: SidebarSettings = { hidden: false, ratio: 24 };

export const LAST_SIDEBAR_SETTINGS_KEY = "nt-sidebar:last";

export const getSidebarSettingsKey = (modelId: string): string => `nt-sidebar:model:${modelId}`;

export const parseSidebarSettings = (raw: string | null): SidebarSettings | undefined => {
  if (raw === null) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  const { hidden, ratio } = value as Record<string, unknown>;
  if (typeof hidden !== "boolean" || typeof ratio !== "number") return undefined;
  if (!(ratio > 0 && ratio < 100)) return undefined;
  return { hidden, ratio };
};

const readSettings = (storage: () => StorageLike, key: string): SidebarSettings | undefined => {
  try {
    return parseSidebarSettings(storage().getItem(key));
  } catch {
    return undefined;
  }
};

export const readSidebarSettings = (
  storage: () => StorageLike,
  modelId: string,
): { stored: SidebarSettings | undefined; lastUsed: SidebarSettings | undefined } => ({
  stored: readSettings(storage, getSidebarSettingsKey(modelId)),
  lastUsed: readSettings(storage, LAST_SIDEBAR_SETTINGS_KEY),
});

export const writeSidebarSettings = (
  storage: () => StorageLike,
  modelId: string,
  settings: SidebarSettings,
): void => {
  const raw = JSON.stringify({ hidden: settings.hidden, ratio: settings.ratio });
  try {
    const target = storage();
    target.setItem(getSidebarSettingsKey(modelId), raw);
    target.setItem(LAST_SIDEBAR_SETTINGS_KEY, raw);
  } catch {
    // Blocked or full storage only costs persistence; the sidebar still works for this visit.
  }
};

export const resolveSidebarSettings = (
  stored: SidebarSettings | undefined,
  lastUsed: SidebarSettings | undefined,
  defaults: SidebarSettings,
): SidebarSettings => {
  if (stored) return { ...stored };
  // The ratio is tuned to each model's layout, so a new model only inherits whether the sidebar was hidden.
  if (lastUsed) return { hidden: lastUsed.hidden, ratio: defaults.ratio };
  return { ...defaults };
};

// On the stacked layout "compact" already means hidden, so a drawer toggle says nothing about the desktop sidebar.
export const getSidebarStatePatch = (
  state: boolean | "compact",
  isDesktop: boolean,
): Pick<SidebarSettings, "hidden"> | undefined => (isDesktop ? { hidden: state === true } : undefined);

export const SIDEBAR_HIDDEN_ATTRIBUTE = "data-nt-sidebar-hidden";

export const SIDEBAR_RATIO_PROPERTY = "--nt-sidebar-ratio";

export const SIDEBAR_BOOT_CSS =
  `html[${SIDEBAR_HIDDEN_ATTRIBUTE}] :is([data-split-start],[data-split-handle]){display:none!important}`;

/*
  Prerendered pages cannot know the saved settings, so this applies them before first paint by the same rules as
  parseSidebarSettings and resolveSidebarSettings: the model's entry wins; the last used one only carries hidden.
*/
export const getSidebarBootScript = (modelId: string): string =>
  `try{` +
  `var read=function(key){try{var v=JSON.parse(localStorage.getItem(key));` +
  `return v&&typeof v.hidden==="boolean"&&typeof v.ratio==="number"&&v.ratio>0&&v.ratio<100?v:null}` +
  `catch(e){return null}};` +
  `var stored=read(${JSON.stringify(getSidebarSettingsKey(modelId))});` +
  `var last=read(${JSON.stringify(LAST_SIDEBAR_SETTINGS_KEY)});` +
  `var root=document.documentElement;` +
  `if(stored?stored.hidden:last&&last.hidden)root.setAttribute("${SIDEBAR_HIDDEN_ATTRIBUTE}","");` +
  `if(stored)root.style.setProperty("${SIDEBAR_RATIO_PROPERTY}",stored.ratio+"%")` +
  `}catch(e){}`;

export const removeSidebarBootState = (root: HTMLElement): void => {
  root.removeAttribute(SIDEBAR_HIDDEN_ATTRIBUTE);
  root.style.removeProperty(SIDEBAR_RATIO_PROPERTY);
};
