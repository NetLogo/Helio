import type { BreadcrumbItem, DropdownMenuItem } from "@nuxt/ui";
import type { ModelNavigation } from "~/utils/modelCuration";
import { getGroupPath, getModelPath, TUTORIAL_PATH } from "../../../../shared/utils/routes.ts";

type Sequence = NonNullable<ModelNavigation["sequence"]>;

export type StepLink = { to?: string; tooltip: string; label: string; disabled: boolean };

export type StepLinks = { previous: StepLink; next: StepLink };

export type OverflowOptions = {
  studentMode: boolean;
  sidebarLabel: string;
  sidebarIcon: string;
  toggleSidebar: () => void;
  swap: () => void;
};

export const buildMenuItems = (nav: ModelNavigation, studentMode: boolean): DropdownMenuItem[][] => [
  ...nav.groups.map((group) => [
    { type: "label" as const, label: group.title },
    ...group.models.map((model) => ({
      label: model.title,
      to: getModelPath(model.id, studentMode),
      slot: model.current ? "current" : undefined,
    })),
  ]),
  [{ label: "All models", icon: "i-lucide-images", to: "/models-library" }],
];

export const buildTrail = (nav: ModelNavigation, title: string): BreadcrumbItem[] => [
  ...(nav.topic ? [{ label: nav.topic.title, to: getGroupPath(nav.topic.id) }] : []),
  { label: title },
];

export const buildStepLinks = (sequence: Sequence, studentMode: boolean): StepLinks => ({
  previous: sequence.previous
    ? {
        to: getModelPath(sequence.previous.id, studentMode),
        tooltip: `Previous: ${sequence.previous.title}`,
        label: `Previous step: ${sequence.previous.title}`,
        disabled: false,
      }
    : { tooltip: "First step", label: "No previous step", disabled: true },
  next: sequence.next
    ? {
        to: getModelPath(sequence.next.id, studentMode),
        tooltip: `Next: ${sequence.next.title}`,
        label: `Next step: ${sequence.next.title}`,
        disabled: false,
      }
    : { tooltip: "Last step", label: "No next step", disabled: true },
});

const buildStepItems = (sequence: Sequence, studentMode: boolean): DropdownMenuItem[] => [
  { type: "label", label: `Step ${sequence.step} of ${sequence.total} in ${sequence.title}` },
  ...(sequence.previous
    ? [{
        label: sequence.previous.title,
        description: "Previous step",
        icon: "i-lucide-chevron-left",
        to: getModelPath(sequence.previous.id, studentMode),
      }]
    : []),
  ...(sequence.next
    ? [{
        label: sequence.next.title,
        description: "Next step",
        icon: "i-lucide-chevron-right",
        to: getModelPath(sequence.next.id, studentMode),
      }]
    : []),
];

export const buildOverflowItems = (nav: ModelNavigation, options: OverflowOptions): DropdownMenuItem[][] => [
  ...(nav.sequence ? [buildStepItems(nav.sequence, options.studentMode)] : []),
  [{ label: "Tutorial", icon: "i-lucide-graduation-cap", to: TUTORIAL_PATH }],
  ...(options.studentMode
    ? []
    : [[
        { label: options.sidebarLabel, icon: options.sidebarIcon, onSelect: options.toggleSidebar },
        { label: "Swap sides", icon: "i-lucide-arrow-up-down", onSelect: options.swap },
      ]]),
];
