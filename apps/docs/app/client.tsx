'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

export function ScrollToHash() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [pathname]);

  return <></>;
}
