import { useEffect, useRef, useState } from 'react';

export default function useHideOnScroll({
  enabled = true,
  threshold = 50,
} = {}) {
  const [show, setShow] = useState(true);
  const prevScrollY = useRef(0);
  const scrollDownAmount = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const handleScroll = () => {
      if (window.scrollY > prevScrollY.current) {
        scrollDownAmount.current += window.scrollY - prevScrollY.current;
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
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled, threshold]);

  return show;
}
