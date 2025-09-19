'use client';

export function ScrollToHash() {
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
