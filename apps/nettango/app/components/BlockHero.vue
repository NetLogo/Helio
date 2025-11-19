<template>
  <div class="hero-visual max-w-[600px]">
    <!-- Increased viewBox height slightly to accommodate the taller stack -->
    <svg viewBox="0 0 370 350" xmlns="http://www.w3.org/2000/svg" class="block-svg">
      <defs>
        <filter id="shadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="0" dy="2" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <!-- Gradients -->
        <linearGradient id="g-green" x2="0" y2="1">
          <stop stop-color="#66BB6A" />
          <stop offset="1" stop-color="#43A047" />
        </linearGradient>
        <linearGradient id="g-red" x2="0" y2="1">
          <stop stop-color="#EF5350" />
          <stop offset="1" stop-color="#E53935" />
        </linearGradient>
        <linearGradient id="g-blue" x2="0" y2="1">
          <stop stop-color="#42A5F5" />
          <stop offset="1" stop-color="#1E88E5" />
        </linearGradient>
        <linearGradient id="g-yellow" x2="0" y2="1">
          <stop stop-color="#FFCA28" />
          <stop offset="1" stop-color="#FFB300" />
        </linearGradient>
        <linearGradient id="grad-orange" x2="0" y2="1">
          <stop stop-color="#FFA726" />
          <stop offset="1" stop-color="#FB8C00" />
        </linearGradient>
        <linearGradient id="grad-purple" x2="0" y2="1">
          <stop stop-color="#AB47BC" />
          <stop offset="1" stop-color="#8E24AA" />
        </linearGradient>
      </defs>

      <!-- Block 1: Green (Go) -->
      <g transform="translate(20, 20)" class="block-group hover-target">
        <path
          d="M 0 10 A 10 10 0 0 1 10 0 L 300 0 A 10 10 0 0 1 310 10 L 310 40 L 25 40 C 25 45 15 45 15 40 L 0 40 Z"
          fill="url(#g-green)"
          filter="url(#shadow)"
          stroke="#43A047"
          stroke-width="1"
        />
        <text
          x="15"
          y="28"
          class="text-label"
          fill="white"
          font-family="sans-serif"
          font-weight="bold"
          font-size="14"
        >
          Go
        </text>
      </g>

      <!-- Block 2: Red (Loop) - Positioned directly under Green -->
      <g transform="translate(20, 60)" class="block-group">
        <!--
             Red Path Calculation:
             Top Bar: 40px high.
             Internal Contents Height:
               Blue (115px) + Wiggle (40px) + NewBlock (40px) = 195px.
             Sidebar runs from y=40 to y=235 (40+195).
             Bottom Bar starts at y=235, height 40px. Total Height = 275px.
        -->
        <g class="hover-target">
          <path
            d="M 0 0 L 15 0 C 15 5 25 5 25 0 L 310 0 A 5 5 0 0 1 315 5 L 315 40 L 40 40 L 40 235 L 315 235 L 315 275 L 25 275 C 25 280 15 280 15 275 L 0 275 L 0 0 Z"
            fill="url(#g-red)"
            filter="url(#shadow)"
            stroke="#E53935"
            stroke-width="1"
          />
          <text
            x="15"
            y="28"
            class="text-label"
            fill="white"
            font-family="sans-serif"
            font-weight="bold"
            font-size="14"
          >
            Each ant
          </text>
        </g>

        <!-- Block 3: Blue (If) - Nested inside Red at (40, 40) -->
        <g transform="translate(40, 40)">
          <g class="hover-target">
            <!--
             Blue Path Calculation:
             Top Bar: 45px high (slightly taller to clear bumps).
             Internal Content: Yellow (50px).
             Sidebar runs from y=45 to y=95.
             Bottom Bar starts y=95, height 20px. Total Height = 115px.
           -->
            <path
              d="M 0 0 L 15 0 L 280 0 A 5 5 0 0 1 285 5 L 285 45 L 25 45 L 25 95 L 285 95 L 285 115 L 25 115 C 25 120 15 120 15 115 L 0 115 Z"
              fill="url(#g-blue)"
              filter="url(#shadow)"
              stroke-width="1"
              stroke="#1E88E5"
            />
            <text
              x="15"
              y="28"
              class="text-label underline decoration-dotted"
              fill="white"
              font-family="sans-serif"
              font-size="14"
            >
              If I am not carrying food
            </text>
          </g>

          <!-- Block 4: Yellow (Turn) - Nested inside Blue -->
          <g transform="translate(25, 45)" class="hover-target">
            <path
              d="M 0 0 L 15 0 L 255 0 A 5 5 0 0 1 260 5 L 260 50 L 25 50 L 0 50 L 0 0 Z "
              fill="url(#g-yellow)"
              stroke="#F9A825"
              stroke-width="1"
            />
            <text
              x="15"
              y="30"
              fill="#333"
              f
              font-size="14"
              class="text-label"
              font-family="sans-serif"
            >
              Turn towards pheromone
            </text>
          </g>
        </g>

        <!-- Block 5: Wiggle (Orange) - Inside Red, under Blue -->
        <!-- Blue ends at 115 (relative to Red inner), Top bar is 40. So y = 40 + 115 = 155 -->
        <g id="wiggle-block" class="hover-target" transform="translate(40, 155)">
          <path
            d="M 0 0 L 15 0 C 15 5 25 5 25 0 L 280 0 A 5 5 0 0 1 285 5 L 285 40 L 25 40 C 25 45 15 45 15 40 L 0 40 L 0 0 Z"
            fill="url(#grad-orange)"
            filter="url(#shadow)"
            stroke="#EF6C00"
            stroke-width="1"
          />
          <text
            x="15"
            y="26"
            class="text-label"
            fill="white"
            font-family="sans-serif"
            font-size="14"
          >
            wiggle
          </text>
        </g>

        <!-- Block 6: New Block (Purple) - Inside Red, under Wiggle -->
        <!-- Wiggle ends at 155 + 40 = 195 -->
        <g transform="translate(40, 195)" class="hover-target">
          <path
            d="M 0 0 L 15 0 C 15 5 25 5 25 0 L 280 0 A 5 5 0 0 1 285 5 L 285 40 L 25 40 C 25 45 15 45 15 40 L 0 40 L 0 0 Z"
            fill="url(#grad-purple)"
            filter="url(#shadow)"
            stroke="#8E24AA"
            stroke-width="1"
          />
          <text
            x="15"
            y="26"
            class="text-label"
            fill="white"
            font-family="sans-serif"
            font-size="14"
          >
            wait 0.5s
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>
