import type { DraftSeed } from './types.js';

export const DRAFTS: DraftSeed[] = [
  {
    key: 'priya-slime',
    user: 'priya',
    title: 'Slime Mold Aggregation',
    description:
      'Draft model of Dictyostelium aggregation via cAMP signaling. Still tuning the chemotaxis parameters.',
    visibility: 'public',
    tags: ['biology', 'swarm-intelligence', 'emergence'],
    primaryFile: { placeholder: true },
    createdDaysAgo: 8,
  },
  {
    key: 'diego-roundabout',
    user: 'diego',
    title: 'Roundabout Flow',
    description: 'A draft exploring whether roundabouts beat signalized intersections at low volume.',
    visibility: 'public',
    tags: ['traffic', 'urban'],
    primaryFile: { file: 'traffic-grid.nlogox', preview: 'traffic-grid-preview.png' },
    createdDaysAgo: 5,
  },
  {
    key: 'chen-markets',
    user: 'chen',
    title: 'Minority Game',
    visibility: 'private',
    tags: ['economics', 'game-theory'],
    createdDaysAgo: 3,
  },
  {
    // A draft that revises an already-published model (a pending new version).
    key: 'amara-virus-net-v2',
    user: 'amara',
    basedOnModel: 'virus-network',
    title: 'Virus on a Network',
    description: 'Adding weighted edges and a quarantine policy toggle for version 2.',
    visibility: 'public',
    tags: ['network', 'epidemiology'],
    primaryFile: { placeholder: true },
    createdDaysAgo: 2,
  },
];
