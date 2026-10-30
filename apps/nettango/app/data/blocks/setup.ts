import type { NtBlockSpec } from "~/utils/blockStack";

export const SETUP_PROGRAM: NtBlockSpec[] = [
  { color: "green", label: "Setup" },
  { color: "red", label: "Create a nest", param: "5" },
  { color: "orange", label: "Create ants", param: "125" },
  { color: "purple", label: "Create a food pile at", param: "20, 0, blue" },
  { color: "purple", label: "Create a food pile at", param: "-25, 30, yellow" },
  { color: "purple", label: "Create a food pile at", param: "-20, -20, red" },
];
