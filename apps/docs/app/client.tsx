'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function ScrollToHash() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      }
    }
  }, [pathname]);

  return (
    <>
      <script>
        {`document.addEventListener('DOMContentLoaded', function() {
            if (window.location.hash) {
            const target = document.querySelector(window.location.hash);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
              // Ensure the target is visible after scrolling
              setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }
          }
        });`}
      </script>
    </>
  );
}
