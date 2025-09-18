import { Metadata } from 'next';

const RootMetadata: Metadata = {
  title: {
    default: 'NetLogo User Manual',
    template: '%s | NetLogo User Manual',
  },
  description:
    'The official documentation for the NetLogo modeling environment, including user manuals, tutorials, and reference materials.',
  keywords: [
    'NetLogo',
    'Documentation',
    'User Manual',
    'Tutorials',
    'Reference',
    'Agent-Based Modeling',
    'Simulation',
    'Programming',
    'Modeling Environment',
  ],
  authors: [
    {
      name: 'Center for Connected Learning and Computer-Based Modeling',
      url: 'https://ccl.northwestern.edu',
    },
  ],
  creator: 'Uri Wilensky',
} as const;

export default RootMetadata;
