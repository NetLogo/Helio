import {
  buildMenuItems,
  buildOverflowItems,
  buildStepLinks,
  buildTrail,
} from "~/components/Models/ModelAppBar/helpers";
import type { GalleryModel } from "~/composables/useModels";

export type ModelAppBarState = {
  model?: GalleryModel;
  studentMode?: boolean;
  sidebarVisible: boolean;
  sidebarIcons: { desktop: string; compact: string };
};

export type ModelAppBarActions = { toggleSidebar: () => void; swap: () => void };

export const useModelAppBar = (state: ModelAppBarState, actions: ModelAppBarActions) => {
  const curation = useModelCuration();
  const models = useModels();

  const nav = computed(() => state.model && getModelNavigation(curation, models, state.model.id));
  const studentMode = computed(() => state.studentMode ?? false);
  const sidebarLabel = computed(() => (state.sidebarVisible ? "Hide details" : "Show details"));

  const menuItems = computed(() => (nav.value ? buildMenuItems(nav.value, studentMode.value) : []));
  const trail = computed(() => (nav.value && state.model ? buildTrail(nav.value, state.model.title) : []));
  const stepLinks = computed(() =>
    nav.value?.sequence ? buildStepLinks(nav.value.sequence, studentMode.value) : null,
  );
  const overflowItems = computed(() =>
    nav.value
      ? buildOverflowItems(nav.value, {
          studentMode: studentMode.value,
          sidebarLabel: sidebarLabel.value,
          sidebarIcon: state.sidebarIcons.compact,
          ...actions,
        })
      : [],
  );

  return { nav, sidebarLabel, menuItems, trail, stepLinks, overflowItems };
};
