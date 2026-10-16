/*
 * Satori renders the Open Graph images and cannot read CSS custom properties,
 * so these mirror the tokens in app/assets/styles/tailwind.css (wall, nt-blue,
 * block-red, screen-glow-edge) and Tailwind's slate scale. Change both together.
 */
export const OG_COLORS = {
  wall: "#eef1f5",
  screen: "#ffffff",
  screenEdge: "#e7eaef",
  blue: "#0670ed",
  blockRed: "#e91400",
  ink: "#0f172a",
  inkToned: "#475569",
} as const;
