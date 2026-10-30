import type { NtBlockColor } from "../components/Nt/NtBlock.vue";

const TOPIC_COLORS: Record<string, NtBlockColor> = {
  antomology: "red",
  rollypollies: "green",
  "gases-particles": "blue",
  spaceship: "purple",
  disease: "yellow",
  biology: "orange",
};

export const getTopicColor = (groupId: string): NtBlockColor => TOPIC_COLORS[groupId] ?? "blue";
