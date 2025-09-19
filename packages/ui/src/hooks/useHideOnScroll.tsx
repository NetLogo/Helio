import { useEffect, useRef, useState } from 'react';

export default function useHideOnScroll({
  enabled = true,
  threshold = 50,
  aggregateThreshold = true,
} = {}): boolean {
  const [show, setShow] = useState(true);
  const prevScrollY = useRef(0);
  const scrollDownAmount = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const handleScroll = (): void => {
      if (window.scrollY > prevScrollY.current) {
        // Scroll amount when scrolling down
        if (aggregateThreshold) {
          scrollDownAmount.current += window.scrollY - prevScrollY.current;
        } else {
          scrollDownAmount.current = window.scrollY - prevScrollY.current;
        }

        // Check if we've scrolled down enough to hide
        if (scrollDownAmount.current > threshold) {
          setShow(false);
        }
      } else {
        scrollDownAmount.current = 0;
        setShow(true);
      }
      prevScrollY.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll);
    // eslint-disable-next-line @typescript-eslint/consistent-return
    return (): void => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, threshold, aggregateThreshold]);

  return show;
}
