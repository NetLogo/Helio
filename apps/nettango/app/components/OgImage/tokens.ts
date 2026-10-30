/*
 * Satori renders the Open Graph images and cannot read CSS custom properties, so these mirror
 * app/assets/styles/tailwind.css: --color-wall, --color-screen-glow, --color-screen-glow-edge,
 * --color-nt-blue-500, --color-block-red, --ui-text and --ui-text-toned. tests/og-tokens.test.mjs checks both.
 */
export const OG_COLORS = {
  wall: "#f4f8fb",
  screen: "#ffffff",
  screenEdge: "#e7eaef",
  blue: "#4e60a6",
  blockRed: "#ba3b3b",
  ink: "#1d2a36",
  inkToned: "#4d5c6a",
} as const;
