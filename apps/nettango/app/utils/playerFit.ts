export const fillHeight = (paneHeight: number, scale: number): number => paneHeight / scale;

// Below this the blocks and widget labels stop being readable; the stage scrolls sideways instead.
export const MIN_PLAYER_SCALE = 0.6;

// A side by side player that needs more shrinking than this reads better stacked at full size.
export const MIN_SIDE_BY_SIDE_SCALE = 0.85;

// Lets the player's side by side row wrap, so the workspace drops under the model in a narrow frame.
export const PLAYER_WRAP_CSS = ".ntb-models-horizontal{flex-wrap:wrap}";

export type PlayerParts = {
  // Margin box widths of the model and the workspace, in player pixels.
  widths: number[];
  sideBySide: boolean;
  // Frame width the player keeps around its row, such as the body margins.
  chrome: number;
};

export const WRAP_STYLE_ID = "nt-player-wrap";

export const injectPlayerWrapStyle = (doc: Document): void => {
  // A frame that has only just started loading its document has no head yet.
  if (!doc.head || doc.getElementById(WRAP_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = WRAP_STYLE_ID;
  style.textContent = PLAYER_WRAP_CSS;
  doc.head.append(style);
};

export const measurePlayerParts = (doc: Document): PlayerParts | undefined => {
  const box = doc.getElementById("ntb-container");
  const row = doc.querySelector(".ntb-models");
  const view = doc.defaultView;
  if (!box || !row || !view) return undefined;
  const widths = [...row.children].map((child) => {
    const { marginLeft, marginRight } = view.getComputedStyle(child);
    return (child as HTMLElement).offsetWidth + parseFloat(marginLeft) + parseFloat(marginRight);
  });
  return {
    widths: widths.filter((width) => width > 0),
    sideBySide: row.classList.contains("ntb-models-horizontal"),
    chrome: doc.documentElement.clientWidth - box.clientWidth,
  };
};

export type PlayerFit = { width: number; scale: number };

export const fitPlayerParts = (paneWidth: number, { widths, sideBySide, chrome }: PlayerParts): PlayerFit => {
  const widest = Math.max(0, ...widths) + chrome;
  const row = sideBySide ? widths.reduce((sum, width) => sum + width, 0) + chrome : widest;
  if (paneWidth <= 0 || row <= paneWidth) return { width: Math.max(paneWidth, row), scale: 1 };
  if (paneWidth >= row * MIN_SIDE_BY_SIDE_SCALE) return { width: row, scale: paneWidth / row };
  if (widest <= paneWidth) return { width: paneWidth, scale: 1 };
  return { width: widest, scale: Math.max(MIN_PLAYER_SCALE, paneWidth / widest) };
};
