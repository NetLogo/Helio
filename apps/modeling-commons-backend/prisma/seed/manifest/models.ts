import type { ModelSeed } from './types.js';

const CSV = (header: string, rows: string) => `${header}\n${rows}`;

export const MODELS: ModelSeed[] = [
  {
    key: 'wolf-sheep',
    legacyId: 1001,
    isEndorsed: true,
    isLibraryModel: true,
    createdDaysAgo: 700,
    authors: [
      { user: 'uri', role: 'owner' },
      { user: 'seth', role: 'contributor' },
    ],
    permissions: [{ grantee: 'maria', level: 'write' }],
    versions: [
      {
        title: 'Wolf Sheep Predation',
        description:
          'A classic predator–prey model exploring the population dynamics between wolves, sheep, and the grass they graze on.',
        netlogoVersion: '7.0.0',
        tags: ['ecology', 'predator-prey', 'biology'],
        file: { file: 'wolf-sheep-predation.nlogox', preview: 'wolf-sheep-preview.png' },
        createdDaysAgo: 700,
        supplementaryFiles: [
          {
            filename: 'initial-populations.csv',
            content: CSV('tick,wolves,sheep', '0,50,100\n1,48,105\n2,45,112'),
          },
        ],
      },
      {
        title: 'Wolf Sheep Predation',
        description:
          'Updated with energy-based movement and grass regrowth mechanics for more realistic equilibria.',
        netlogoVersion: '7.0.3',
        tags: ['ecology', 'predator-prey', 'biology', 'emergence'],
        file: { file: 'wolf-sheep-predation-v2.nlogox', preview: 'wolf-sheep-preview.png' },
        createdDaysAgo: 210,
      },
    ],
    additionalFiles: [
      {
        taggedVersionNumber: 1,
        filename: 'README.md',
        content: '# Wolf Sheep Predation\n\nA classic predator-prey model.',
      },
    ],
    popularity: {
      views: 612,
      runs: 248,
      downloads: 96,
      shares: 34,
      likedBy: ['maria', 'kenji', 'priya', 'diego', 'amara', 'liam', 'chen'],
    },
  },
  {
    key: 'wolf-sheep-seasonal',
    parent: 'wolf-sheep',
    parentVersionNumber: 2,
    createdDaysAgo: 120,
    authors: [{ user: 'maria', role: 'owner' }],
    versions: [
      {
        title: 'Wolf Sheep – Seasonal Variant',
        description:
          'A fork of Wolf Sheep Predation that adds seasonal grass-growth patterns, producing boom-and-bust cycles.',
        netlogoVersion: '7.0.0',
        tags: ['ecology', 'predator-prey', 'climate'],
        file: { file: 'wolf-sheep-predation-fork.nlogox', preview: 'wolf-sheep-preview.png' },
      },
    ],
    popularity: { views: 143, runs: 61, downloads: 18, shares: 5, likedBy: ['uri', 'kenji'] },
  },
  {
    key: 'wolf-sheep-grass',
    parent: 'wolf-sheep',
    parentVersionNumber: 2,
    createdDaysAgo: 60,
    authors: [{ user: 'kenji', role: 'owner' }],
    versions: [
      {
        title: 'Wolf Sheep – Classroom Edition',
        description:
          'A simplified fork used in a high-school biology class to introduce carrying capacity.',
        netlogoVersion: '7.0.3',
        tags: ['ecology', 'predator-prey', 'education', 'beginner'],
        file: { placeholder: true, preview: 'wolf-sheep-preview.png' },
      },
    ],
    popularity: { views: 87, runs: 40, downloads: 12, shares: 2, likedBy: ['maria'] },
  },

  {
    key: 'fire',
    legacyId: 1002,
    isEndorsed: true,
    isLibraryModel: true,
    createdDaysAgo: 680,
    authors: [{ user: 'seth', role: 'owner' }],
    permissions: [{ grantee: 'uri', level: 'admin' }],
    versions: [
      {
        title: 'Fire',
        description:
          "Simulates the spread of fire through a forest. The fire's chance of reaching the far edge depends critically on tree density — a classic example of a non-linear phase transition.",
        netlogoVersion: '6.4.0',
        tags: ['fire', 'emergence', 'physics'],
        file: { file: 'fire.nlogox', preview: 'fire-preview.png' },
      },
    ],
    additionalFiles: [
      {
        taggedVersionNumber: 1,
        filename: 'burn-results.csv',
        content: CSV('density,burned_pct', '50,18\n59,52\n65,86\n75,98'),
      },
    ],
    popularity: {
      views: 504,
      runs: 301,
      downloads: 74,
      shares: 21,
      likedBy: ['uri', 'kenji', 'diego', 'fatima', 'maria'],
    },
  },
  {
    key: 'fire-big',
    parent: 'fire',
    parentVersionNumber: 1,
    createdDaysAgo: 45,
    authors: [{ user: 'kenji', role: 'owner' }],
    versions: [
      {
        title: 'Fire – Large Forests',
        description:
          'A fork that scales the world up and adds wind direction to study fire-front behavior at larger scales.',
        netlogoVersion: '7.0.0',
        tags: ['fire', 'emergence', 'climate'],
        file: { placeholder: true, preview: 'fire-preview.png' },
      },
    ],
    popularity: { views: 66, runs: 33, downloads: 9, shares: 1, likedBy: ['seth'] },
  },

  {
    key: 'ants',
    legacyId: 1003,
    isEndorsed: true,
    isLibraryModel: true,
    createdDaysAgo: 660,
    authors: [{ user: 'uri', role: 'owner' }],
    versions: [
      {
        title: 'Ants',
        description:
          'A colony of ants forages for food. Each ant follows simple pheromone rules, yet the colony as a whole finds the shortest paths to food — emergent optimization.',
        netlogoVersion: '6.3.0',
        tags: ['biology', 'swarm-intelligence', 'emergence'],
        file: { file: 'ants.nlogox', preview: 'ants-preview.png' },
      },
    ],
    popularity: {
      views: 458,
      runs: 192,
      downloads: 63,
      shares: 19,
      likedBy: ['priya', 'kenji', 'maria', 'diego'],
    },
  },

  {
    key: 'traffic-basic',
    legacyId: 1004,
    isLibraryModel: true,
    createdDaysAgo: 520,
    authors: [{ user: 'uri', role: 'owner' }],
    versions: [
      {
        title: 'Traffic Basic',
        description:
          'A single lane of cars on a circular road. A single slow-down can cascade into a phantom traffic jam that travels backward through the line of cars.',
        netlogoVersion: '6.4.0',
        tags: ['traffic', 'emergence', 'beginner'],
        file: { file: 'traffic-basic.nlogox', preview: 'traffic-basic-preview.png' },
      },
    ],
    popularity: {
      views: 388,
      runs: 156,
      downloads: 41,
      shares: 12,
      likedBy: ['diego', 'liam', 'kenji'],
    },
  },
  {
    key: 'traffic-grid',
    legacyId: 1005,
    isLibraryModel: true,
    createdDaysAgo: 360,
    authors: [{ user: 'uri', role: 'owner' }],
    versions: [
      {
        title: 'Traffic Grid',
        description:
          'Cars move through a grid of intersections governed by traffic lights. Tune light timing to minimize average wait time across the city.',
        netlogoVersion: '7.0.0',
        tags: ['traffic', 'urban', 'emergence'],
        file: { file: 'traffic-grid.nlogox', preview: 'traffic-grid-preview.png' },
      },
    ],
    popularity: { views: 271, runs: 118, downloads: 35, shares: 9, likedBy: ['diego', 'liam'] },
  },
  {
    key: 'traffic-2-lanes',
    parent: 'traffic-basic',
    parentVersionNumber: 1,
    createdDaysAgo: 150,
    authors: [{ user: 'diego', role: 'owner' }],
    permissions: [{ grantee: null, level: 'read' }],
    versions: [
      {
        title: 'Traffic – 2 Lanes',
        description:
          'Extends Traffic Basic to two lanes with lane-changing, exploring how merging behavior affects throughput.',
        netlogoVersion: '7.0.0',
        tags: ['traffic', 'urban', 'emergence'],
        file: { file: 'traffic-2-lanes.nlogox', preview: 'traffic-2-lanes-preview.png' },
      },
    ],
    popularity: { views: 132, runs: 58, downloads: 14, shares: 3, likedBy: ['liam'] },
  },

  {
    key: 'virus-network',
    legacyId: 1006,
    isLibraryModel: true,
    createdDaysAgo: 300,
    authors: [
      { user: 'amara', role: 'owner' },
      { user: 'uri', role: 'contributor' },
    ],
    versions: [
      {
        title: 'Virus on a Network',
        description:
          'Models how a virus spreads through a network of connected nodes, and how vaccination and recovery rates change the outcome.',
        netlogoVersion: '6.4.0',
        tags: ['network', 'epidemiology', 'biology'],
        file: { placeholder: true },
      },
    ],
    popularity: {
      views: 297,
      runs: 134,
      downloads: 48,
      shares: 16,
      likedBy: ['amara', 'maria', 'liam', 'fatima'],
    },
  },
  {
    key: 'virus',
    isLibraryModel: true,
    createdDaysAgo: 280,
    authors: [{ user: 'amara', role: 'owner' }],
    versions: [
      {
        title: 'Virus',
        description:
          'A well-mixed population model of infection, recovery, and immunity — the spatial counterpart to Virus on a Network.',
        netlogoVersion: '6.4.0',
        tags: ['epidemiology', 'biology'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 188, runs: 79, downloads: 22, shares: 6, likedBy: ['fatima', 'maria'] },
  },
  {
    key: 'rumor-mill',
    createdDaysAgo: 90,
    authors: [{ user: 'fatima', role: 'owner' }],
    versions: [
      {
        title: 'Rumor Mill',
        description:
          'How does a rumor propagate through a social network? Compare broadcast, word-of-mouth, and influencer-seeded spreading.',
        netlogoVersion: '7.0.0',
        tags: ['network', 'social-science'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 74, runs: 28, downloads: 7, shares: 4, likedBy: ['liam'] },
  },

  {
    key: 'flocking',
    isEndorsed: true,
    isLibraryModel: true,
    createdDaysAgo: 640,
    authors: [{ user: 'uri', role: 'owner' }],
    versions: [
      {
        title: 'Flocking',
        description:
          'Birds follow three simple rules — alignment, separation, and cohesion — and coherent flocks emerge with no leader.',
        netlogoVersion: '6.4.0',
        tags: ['biology', 'swarm-intelligence', 'emergence'],
        file: { placeholder: true, preview: 'ants-preview.png' },
      },
    ],
    popularity: {
      views: 421,
      runs: 173,
      downloads: 57,
      shares: 18,
      likedBy: ['priya', 'maria', 'kenji', 'diego'],
    },
  },
  {
    key: 'termites',
    isLibraryModel: true,
    createdDaysAgo: 250,
    authors: [{ user: 'priya', role: 'owner' }],
    versions: [
      {
        title: 'Termites',
        description:
          'Termites pile up wood chips into a single mound by following purely local rules — stigmergy in action.',
        netlogoVersion: '6.3.0',
        tags: ['biology', 'swarm-intelligence', 'emergence'],
        file: { placeholder: true, preview: 'ants-preview.png' },
      },
    ],
    popularity: { views: 165, runs: 72, downloads: 19, shares: 5, likedBy: ['priya', 'uri'] },
  },

  // ── Cellular automata & math ──────────────────────────────────────────────
  {
    key: 'game-of-life',
    isEndorsed: true,
    isLibraryModel: true,
    createdDaysAgo: 600,
    authors: [{ user: 'seth', role: 'owner' }],
    versions: [
      {
        title: 'Life',
        description:
          "Conway's Game of Life — the canonical cellular automaton. Gliders, blinkers, and still lifes from two simple birth/death rules.",
        netlogoVersion: '6.4.0',
        tags: ['cellular-automata', 'mathematics', 'emergence'],
        file: { placeholder: true },
      },
    ],
    popularity: {
      views: 356,
      runs: 201,
      downloads: 44,
      shares: 13,
      likedBy: ['maria', 'chen', 'kenji'],
    },
  },
  {
    key: 'diffusion',
    isLibraryModel: true,
    createdDaysAgo: 470,
    authors: [{ user: 'seth', role: 'owner' }],
    versions: [
      {
        title: 'Diffusion Graphics',
        description:
          'Watch a substance diffuse across a grid, illustrating how local averaging produces smooth global gradients.',
        netlogoVersion: '6.4.0',
        tags: ['physics', 'chemistry', 'mathematics'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 122, runs: 54, downloads: 11, shares: 2, likedBy: ['maria'] },
  },

  {
    key: 'segregation',
    isEndorsed: true,
    isLibraryModel: true,
    createdDaysAgo: 580,
    authors: [{ user: 'uri', role: 'owner' }],
    versions: [
      {
        title: 'Segregation',
        description:
          "Schelling's model of segregation: even a mild preference to live near similar neighbors tips a mixed neighborhood into stark segregation.",
        netlogoVersion: '6.4.0',
        tags: ['social-science', 'segregation', 'emergence'],
        file: { placeholder: true, preview: 'traffic-grid-preview.png' },
      },
    ],
    popularity: {
      views: 398,
      runs: 142,
      downloads: 61,
      shares: 22,
      likedBy: ['liam', 'chen', 'maria', 'fatima'],
    },
  },
  {
    key: 'wealth-distribution',
    createdDaysAgo: 110,
    authors: [{ user: 'chen', role: 'owner' }],
    permissions: [{ grantee: 'liam', level: 'read' }],
    versions: [
      {
        title: 'Wealth Distribution',
        description:
          'Agents harvest and trade on a grain landscape. Starting from equality, a skewed wealth distribution emerges and persists.',
        netlogoVersion: '7.0.0',
        tags: ['economics', 'social-science', 'emergence'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 96, runs: 38, downloads: 13, shares: 4, likedBy: ['chen', 'liam'] },
  },
  {
    key: 'el-farol',
    isLibraryModel: true,
    createdDaysAgo: 230,
    authors: [{ user: 'chen', role: 'owner' }],
    versions: [
      {
        title: 'El Farol',
        description:
          'A bounded-rationality classic: bar-goers use competing strategies to predict the crowd, and attendance hovers around capacity.',
        netlogoVersion: '6.4.0',
        tags: ['economics', 'game-theory', 'complexity'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 141, runs: 49, downloads: 16, shares: 5, likedBy: ['chen'] },
  },
  {
    key: 'pd-n-person',
    isLibraryModel: true,
    createdDaysAgo: 320,
    authors: [{ user: 'liam', role: 'owner' }],
    versions: [
      {
        title: 'PD N-Person Iterated',
        description:
          'An N-person iterated Prisoner’s Dilemma. Watch cooperation rise and fall as strategies meet repeatedly.',
        netlogoVersion: '6.4.0',
        tags: ['game-theory', 'social-science', 'evolution'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 177, runs: 83, downloads: 24, shares: 8, likedBy: ['liam', 'chen'] },
  },
  {
    key: 'heroes-cowards',
    createdDaysAgo: 70,
    authors: [{ user: 'liam', role: 'owner' }],
    versions: [
      {
        title: 'Heroes and Cowards',
        description:
          'Every agent secretly picks a friend and an enemy, then either hides behind their friend (coward) or steps between friend and enemy (hero). Two rules, wildly different patterns.',
        netlogoVersion: '7.0.0',
        tags: ['social-science', 'emergence', 'beginner'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 109, runs: 62, downloads: 10, shares: 6, likedBy: ['kenji', 'diego'] },
  },

  {
    key: 'ising',
    isLibraryModel: true,
    createdDaysAgo: 200,
    authors: [{ user: 'maria', role: 'owner' }],
    versions: [
      {
        title: 'Ising',
        description:
          'The Ising model of ferromagnetism. Sweep the temperature through the critical point and watch spontaneous magnetization appear.',
        netlogoVersion: '6.4.0',
        tags: ['physics', 'emergence', 'complexity'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 134, runs: 71, downloads: 17, shares: 3, likedBy: ['maria', 'seth'] },
  },
  {
    key: 'daisyworld',
    isLibraryModel: true,
    createdDaysAgo: 260,
    authors: [{ user: 'maria', role: 'owner' }],
    versions: [
      {
        title: 'Daisyworld',
        description:
          'Black and white daisies regulate the temperature of an imaginary planet, a vivid illustration of the Gaia hypothesis.',
        netlogoVersion: '6.4.0',
        tags: ['climate', 'ecology', 'biology'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 158, runs: 64, downloads: 20, shares: 7, likedBy: ['maria', 'kenji'] },
  },

  {
    key: 'forest-succession',
    visibility: 'private',
    createdDaysAgo: 25,
    authors: [{ user: 'maria', role: 'owner' }],
    permissions: [{ grantee: 'uri', level: 'read' }],
    versions: [
      {
        title: 'Forest Succession (WIP)',
        description:
          'Unpublished work in progress: modeling how a forest recovers after disturbance through species succession.',
        netlogoVersion: '7.0.0',
        tags: ['ecology', 'evolution'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 12, runs: 3, downloads: 0, shares: 0, likedBy: [] },
  },
  {
    key: 'sophie-sandbox',
    visibility: 'unlisted',
    createdDaysAgo: 40,
    authors: [{ user: 'sophie', role: 'owner' }],
    versions: [
      {
        title: 'Diffusion Experiments',
        description:
          'Unlisted scratchpad for course assignments — shareable by link but hidden from search.',
        netlogoVersion: '7.0.0',
        tags: ['physics', 'education'],
        file: { placeholder: true },
      },
    ],
    popularity: { views: 31, runs: 9, downloads: 2, shares: 1, likedBy: [] },
  },
  {
    key: 'noah-deleted',
    deleted: true,
    createdDaysAgo: 20,
    authors: [{ user: 'noah', role: 'owner' }],
    versions: [
      {
        title: 'Untitled Test Model',
        description: 'A test model the author later deleted.',
        netlogoVersion: '7.0.0',
        tags: ['beginner'],
        file: { placeholder: true },
      },
    ],
  },
];
