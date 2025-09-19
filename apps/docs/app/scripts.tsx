import Script from 'next/script';

export function ScrollToHash() {
  return (
    <Script id="scroll-to-hash" strategy="afterInteractive">
      {`(function() {
        document.addEventListener('DOMContentLoaded', function() {
            if (window.location.hash) {
            console.log('Scrolling to hash:', window.location.hash);
            const target = document.querySelector(window.location.hash);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' });
              // Ensure the target is visible after scrolling
              setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }
          }
        });
      })();`}
    </Script>
  );
}
