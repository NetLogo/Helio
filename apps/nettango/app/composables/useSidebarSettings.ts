import {
  DEFAULT_SIDEBAR_SETTINGS,
  readSidebarSettings,
  resolveSidebarSettings,
  writeSidebarSettings,
  type SidebarSettings,
} from "~/utils/sidebarSettings";

const getBrowserStorage = (): Storage => window.localStorage;

// Client only: call load() from onMounted, since the server has no localStorage.
export const useSidebarSettings = (modelId: string) => {
  let current: SidebarSettings = { ...DEFAULT_SIDEBAR_SETTINGS };

  const load = (): SidebarSettings => {
    const { stored, lastUsed } = readSidebarSettings(getBrowserStorage, modelId);
    current = resolveSidebarSettings(stored, lastUsed, DEFAULT_SIDEBAR_SETTINGS);
    return current;
  };

  const save = (patch: Partial<SidebarSettings>): void => {
    current = { ...current, ...patch };
    writeSidebarSettings(getBrowserStorage, modelId, current);
  };

  return { load, save };
};
