<template>
  <div class="w-full flex justify-center">
    <svg
      viewBox="0 0 305 350"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full max-w-[350px] h-auto drop-shadow-lg"
    >
      <defs>
        <!-- Colors / Gradients matching the image -->
        <linearGradient id="grad-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#558B0B" />
          <stop offset="100%" stop-color="#437006" />
        </linearGradient>

        <linearGradient id="grad-dark-grey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#444444" />
          <stop offset="100%" stop-color="#333333" />
        </linearGradient>

        <linearGradient id="grad-light-grey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9E9E9E" />
          <stop offset="100%" stop-color="#888888" />
        </linearGradient>

        <linearGradient id="grad-purple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9B30FF" />
          <stop offset="100%" stop-color="#7A15D6" />
        </linearGradient>

        <filter id="subtle-shadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
          <feOffset dx="0" dy="1" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- ==============================
           BLOCK 1: SETUP (Green Cap)
           Height: 40px
           ============================== -->
      <g class="block-group">
        <!-- Top Rounded, Bottom has Tab -->
        <path
          d="M 0 10 A 10 10 0 0 1 10 0 L 290 0 A 10 10 0 0 1 300 10 L 300 40 L 25 40 C 25 45 15 45 15 40 L 0 40 Z"
          fill="url(#grad-green)"
          stroke="#388E3C"
          stroke-width="1"
        />
        <text x="12" y="25" class="text-label label-u">Setup</text>
      </g>

      <!-- ==============================
           BLOCK 2: CREATE NEST (Dark Grey)
           Y: 40px | Height: 40px
           ============================== -->
      <g transform="translate(0, 40)" class="block-group">
        <!-- Top Socket, Bottom Tab -->
        <path
          d="M 0 0 L 15 0 C 15 5 25 5 25 0 L 300 0 L 300 40 L 25 40 C 25 45 15 45 15 40 L 0 40 Z"
          fill="url(#grad-dark-grey)"
          stroke="#212121"
          stroke-width="1"
        />
        <text x="12" y="25" class="text-label label-u">Create a nest</text>

        <!-- Input: 5 -->
        <rect x="260" y="7" width="30" height="26" rx="8" fill="white" />
        <text x="275" y="25" class="input-text">5</text>
      </g>

      <!-- ==============================
           BLOCK 3: CREATE ANTS (Light Grey)
           Y: 80px | Height: 40px
           ============================== -->
      <g transform="translate(0, 80)" class="block-group">
        <path
          d="M 0 0 L 15 0 C 15 5 25 5 25 0 L 300 0 L 300 40 L 25 40 C 25 45 15 45 15 40 L 0 40 Z"
          fill="url(#grad-light-grey)"
          stroke="#757575"
          stroke-width="1"
        />
        <text x="12" y="25" class="text-label label-u">Create Ants</text>

        <!-- Input: 125 -->
        <rect x="240" y="7" width="50" height="26" rx="10" fill="white" />
        <text x="265" y="25" class="input-text">125</text>
      </g>

      <!-- ==============================
           BLOCK 4: FOOD PILE 1 (Purple)
           Y: 120px | Height: 70px (Double row)
           ============================== -->
      <g transform="translate(0, 120)" class="block-group">
        <path
          d="M 0 0 L 15 0 C 15 5 25 5 25 0 L 300 0 L 300 70 L 25 70 C 25 75 15 75 15 70 L 0 70 Z"
          fill="url(#grad-purple)"
          stroke="#6A1B9A"
          stroke-width="1"
        />
        <!-- Row 1 -->
        <text x="12" y="25" class="text-label label-u">Create a food pile</text>
        <polygon points="160,20 166,20 163,16" fill="white" />
        <!-- Tiny triangle arrow -->

        <rect x="212" y="7" width="40" height="24" rx="10" fill="white" />
        <text x="232" y="24" class="input-text-dropdown">20</text>

        <rect x="260" y="7" width="30" height="24" rx="10" fill="white" />
        <text x="275" y="24" class="input-text-dropdown">0</text>

        <!-- Row 2 -->
        <circle cx="25" cy="50" r="2" fill="white" />
        <text x="34" y="55" class="label">Color</text>

        <!-- Dropdown -->
        <rect x="219" y="35" width="71" height="24" rx="10" fill="white" />
        <text x="229" y="52" class="input-text-dropdown">Blue</text>
        <path d="M 270 48 L 278 48 L 274 54 Z" fill="#6A1B9A" :style="{ translate: '0 -4px' }" />
        <!-- Dropdown arrow -->
      </g>

      <!-- ==============================
           BLOCK 5: FOOD PILE 2 (Purple)
           Y: 190px | Height: 70px
           ============================== -->
      <g transform="translate(0, 190)" class="block-group">
        <path
          d="M 0 0 L 15 0 C 15 5 25 5 25 0 L 300 0 L 300 70 L 25 70 C 25 75 15 75 15 70 L 0 70 Z"
          fill="url(#grad-purple)"
          stroke="#6A1B9A"
          stroke-width="1"
        />

        <text x="12" y="25" class="text-label label-u">Create a food pile</text>
        <polygon points="160,20 166,20 163,16" fill="white" />

        <rect x="196" y="7" width="45" height="24" rx="10" fill="white" />
        <text x="219" y="24" class="input-text-dropdown">-25</text>

        <rect x="250" y="7" width="40" height="24" rx="10" fill="white" />
        <text x="270" y="24" class="input-text-dropdown">30</text>

        <circle cx="25" cy="50" r="2" fill="white" />
        <text x="34" y="55" class="label">Color</text>

        <rect x="204" y="35" width="86" height="24" rx="10" fill="white" />
        <text x="214" y="52" class="input-text-dropdown">Yellow</text>
        <path d="M 270 48 L 278 48 L 274 54 Z" fill="#6A1B9A" :style="{ translate: '0 -4px' }" />
      </g>

      <!-- ==============================
           BLOCK 6: FOOD PILE 3 (Purple)
           Y: 260px | Height: 70px
           ============================== -->
      <g transform="translate(0, 260)" class="block-group">
        <!-- Bottom has tab sticking out in image, usually indicates 'next' -->
        <path
          d="M 0 0 L 15 0 C 15 5 25 5 25 0 L 300 0 L 300 60 A 10 10 0 0 1 290 70 L 25 70 C 25 75 15 75 15 70 L 10 70 A 10 10 0 0 1 0 60 Z"
          fill="url(#grad-purple)"
          stroke="#6A1B9A"
          stroke-width="1"
        />

        <text x="12" y="25" class="text-label label-u">Create a food pile</text>
        <polygon points="160,20 166,20 163,16" fill="white" />

        <rect x="190" y="7" width="45" height="24" rx="10" fill="white" />
        <text x="213" y="24" class="input-text-dropdown">-20</text>

        <rect x="245" y="7" width="45" height="24" rx="10" fill="white" />
        <text x="268" y="24" class="input-text-dropdown">-20</text>

        <circle cx="25" cy="50" r="2" fill="white" />
        <text x="34" y="55" class="label">Color</text>

        <rect x="222" y="35" width="68" height="24" rx="10" fill="white" />
        <text x="232" y="52" class="input-text-dropdown">Red</text>
        <path d="M 270 48 L 278 48 L 274 54 Z" fill="#6A1B9A" :style="{ translate: '0 -4px' }" />

        <!-- Final Tab Sticking out (Connector to nothing) -->
        <path d="M 15 70 C 15 75 25 75 25 70" fill="url(#grad-purple)" stroke="none" />
        <path d="M 25 70 C 25 77 15 77 15 70" fill="#7A15D6" stroke="none" opacity="0.5" />
        <!-- Shadow for depth -->
      </g>
    </svg>
  </div>
</template>
<style scoped>
.label {
  font-family: sans-serif;
  fill: white;
  font-size: 14px;
  font-weight: 500;
}
.label-u {
  text-decoration: underline;
  text-decoration-style: dotted;
}
.input-text {
  font-family: sans-serif;
  fill: #555;
  font-size: 13px;
  font-weight: 600;
  text-anchor: middle;
}
.input-text-dropdown {
  font-family: sans-serif;
  fill: #6a1b9a;
  font-size: 13px;
  font-weight: 600;
}
</style>
