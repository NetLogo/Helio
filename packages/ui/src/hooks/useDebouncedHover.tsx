import { useCallback, useEffect, useRef } from 'react';

/**
 * useDebouncedHover
 *
 * @param onEnter - callback to run on hover enter (after debounce)
 * @param onLeave - callback to run on hover leave (after debounce)
 * @param enterDelay - debounce ms for enter (default 150)
 * @param leaveDelay - debounce ms for leave (default 200)
 * @returns { onMouseEnter, onMouseLeave } - event handlers for your element
 */
export function useDebouncedHover(
  onEnter: (e: React.MouseEvent<HTMLElement>) => void,
  onLeave: (e: React.MouseEvent<HTMLElement>) => void,
  enterDelay = 150,
  leaveDelay = 200
) {
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      enterTimer.current = setTimeout(() => {
        onEnter(e);
      }, enterDelay);
    },
    [onEnter, enterDelay]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
      leaveTimer.current = setTimeout(() => {
        onLeave(e);
      }, leaveDelay);
    },
    [onLeave, leaveDelay]
  );

  useEffect(() => {
    return () => {
      // Optionally, clear timers on unmount
      if (enterTimer.current) clearTimeout(enterTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, [onEnter, onLeave]);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
}
