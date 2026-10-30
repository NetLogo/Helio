import type { NtBlockSpec } from "~/utils/blockStack";

export const GO_PROGRAM: NtBlockSpec[] = [
  { color: "green", label: "Go" },
  {
    color: "red",
    label: "Each ant",
    children: [
      {
        color: "blue",
        label: "If",
        param: "I am not carrying food",
        children: [{ color: "yellow", label: "Turn towards pheromone smell" }],
      },
      { color: "orange", label: "Wiggle" },
      { color: "purple", label: "Move forward" },
    ],
  },
];
