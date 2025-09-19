import Script from 'next/script';
import type { JSX } from 'react';

export function ScrollToHash(): JSX.Element {
  return (
    <Script id="scroll-to-hash" strategy="beforeInteractive">
      {`(function() {
        document.addEventListener('DOMContentLoaded', function() {
            if (window.location.hash) {
            const target = document.querySelector(window.location.hash);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
              // Ensure the target is visible after scrolling
              setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 200);
            }
          }
        });
      })();`}
    </Script>
  );
}
