export const fitScale = (paneWidth: number, playerWidth: number): number =>
  paneWidth > 0 && playerWidth > paneWidth ? paneWidth / playerWidth : 1;

export const fitHeight = (playerHeight: number, scale: number): number => playerHeight * scale;

export const fillHeight = (paneHeight: number, scale: number): number => paneHeight / scale;

// The exported players spill their fixed-width content past a container that keeps its own
// margins, so the width that fits is the frame plus that spill, not the container's scrollWidth.
export const playerWidth = (
  frameWidth: number,
  box: { scrollWidth: number; clientWidth: number },
): number => frameWidth + Math.max(0, box.scrollWidth - box.clientWidth);
