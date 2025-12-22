import { assets } from './assets';
import type { Product } from './types';

const netlogoProduct: Product = {
  id: 'netlogo',
  name: 'NetLogo',
  description: 'A multi-agent programmable modeling environment for Windows, MacOS, and Linux.',
  longDescription:
    'NetLogo is a multi-agent programmable modeling environment used by students, teachers, and researchers worldwide. It allows users to create simulations of natural and social phenomena, providing a platform for exploring complex systems through agent-based modeling. NetLogo is simple enough for students and teachers, yet advanced enough for researchers in many fields.',
  logoUrl: assets['logo/netlogo-desktop'],
  iconUrl: assets['icon/netlogo-desktop'],
  iconName: 'netlogo-netlogo-desktop',
  preferredIconUrl: assets['icon/netlogo-desktop'],
  productExternalHomePage: 'https://www.netlogo.org',
  ctaPrimaryLabel: 'Start with a Tutorial',
  ctaPrimaryUrl: '/getting-started/tutorial-0',
  ctaSecondaryLabel: 'Download NetLogo',
  ctaSecondaryUrl: 'https://www.netlogo.org/download',
  prerequisites: [
    { type: 'url', value: 'https://www.netlogo.org/download', title: 'Download NetLogo' },
    { type: 'article', value: '/articles/getting-started-with-netlogo' },
    { type: 'article', value: '/getting-started/tutorial-0' },
    { type: 'article', value: '/getting-started/tutorial-1' },
    { type: 'article', value: '/getting-started/tutorial-2' },
    { type: 'article', value: '/getting-started/tutorial-3' },
  ],
};

const netLogoWebProduct: Product = {
  id: 'netlogo-web',
  name: 'NetLogo Web',
  description:
    'NetLogo Web is a version of the NetLogo modeling environment that runs entirely in the browser, including tablets, phones and Chromebooks.',
  longDescription:
    'NetLogo Web is the web-based version of NetLogo, allowing users to run and share NetLogo models directly in their web browsers without the need for any software installation. It provides a convenient way for students, educators, and researchers to access and interact with NetLogo models from any device with internet connectivity.',
  logoUrl: assets['logo/netlogo-web'],
  iconUrl: assets['icon/netlogo-web'],
  iconName: 'netlogo-netlogo-desktop',
  productExternalHomePage: 'https://www.netlogoweb.org',
  ctaPrimaryLabel: 'Start with a Tutorial',
  ctaPrimaryUrl: '/netlogo/party-tutorial',
  ctaSecondaryLabel: 'Try NetLogo Web',
  ctaSecondaryUrl: 'https://www.netlogoweb.org',
  prerequisites: [
    { type: 'text', value: 'A modern web browser (e.g., Chrome, Firefox, Safari, Edge).', icon: 'i-lucide-laptop' },
    { type: 'article', value: '/articles/getting-started-with-netlogo' },
    { type: 'article', value: '/getting-started/tutorial-0' },
    { type: 'article', value: '/getting-started/tutorial-1' },
    { type: 'article', value: '/getting-started/tutorial-2' },
    { type: 'article', value: '/getting-started/tutorial-3' },
  ],
};

const nettangoProduct: Product = {
  id: 'nettango',
  name: 'NetTango',
  description: 'Block-based NetLogo Web for educators and learners.',
  longDescription:
    'NetTango is a block-based programming environment built on top of NetLogo Web, designed specifically for educators and learners. It simplifies the process of creating agent-based models by providing a visual, drag-and-drop interface that allows users to build simulations without needing to write code.',
  logoUrl: assets['logo/nettango'],
  iconUrl: assets['icon/nettango'],
  iconName: 'netlogo-nettango',
  preferredIconUrl: assets['logo/nettango'],
  productExternalHomePage: 'https://netlogoweb.org/nettango-builder',
  prerequisites: [
    { type: 'product', value: 'netlogo-web' },
    { type: 'article', value: '/articles/getting-started-with-netlogo' },
    {
      type: 'url',
      title: 'Introduction to the NetTango builder',
      value: 'https://ccl.northwestern.edu/nettangoweb/tutorial/',
    },
  ],
};

const behaviorSearchProduct: Product = {
  id: 'behavior-search',
  name: 'Behavior Search',
  description:
    'Automating the exploration of agent-based models (ABMs), by using genetic algorithms and other heuristic techniques to search the parameter-space.',
  longDescription:
    'BehaviorSearch is a software tool to help with automating the exploration of agent-based models (ABMs), by using genetic algorithms and other heuristic techniques to search the parameter-space.',
  logoUrl: assets['logo/behavior-search'],
  iconUrl: assets['icon/behavior-search'],
  iconName: 'netlogo-behavior-search',
  productExternalHomePage: 'https://www.behaviorsearch.org',
  prerequisites: [{ type: 'product', value: 'netlogo' }],
};

const hubnetWebProduct: Product = {
  id: 'hubnet-web',
  name: 'HubNet Web',
  description:
    'HubNet Web is the latest evolution of the HubNet technology for participatory simulations, which typically take the form of something like brief, educational, multiplayer games.',
  longDescription:
    'HubNet Web is the latest evolution of the HubNet technology for participatory simulations, which typically take the form of something like brief, educational, multiplayer games.',
  logoUrl: assets['logo/hubnet-web'],
  iconUrl: assets['icon/hubnet-web'],
  iconName: 'netlogo-hubnet-web',
  productExternalHomePage: 'https://www.netlogoweb.org/hubnet',
  prerequisites: [{ type: 'product', value: 'netlogo-web' }],
};

const netlogo3dProduct: Product = {
  id: 'netlogo-3d',
  name: 'NetLogo 3D',
  description: 'NetLogo 3D is a three-dimensional version of the NetLogo modeling environment.',
  longDescription: 'NetLogo 3D is a three-dimensional version of the NetLogo modeling environment.',
  logoUrl: assets['logo/netlogo-3d'],
  iconUrl: assets['icon/netlogo-3d'],
  iconName: 'netlogo-netlogo-3d',
  productExternalHomePage: 'https://www.netlogo.org/3d',
  prerequisites: [{ type: 'product', value: 'netlogo' }],
};

const turtleUniverseProduct: Product = {
  id: 'turtle-universe',
  name: 'Turtle Universe',
  description:
    'Understand social and scientific phenomena & learn STEM, coding, social science & many other topics by playing with scientific models created and used by scientists and researchers.',
  longDescription:
    'Turtle Universe is inspired by NetLogo, the most widely used multi-agent programmable modeling environment. We now bring the power of computational modeling to the phones and tablets of young students and educators alike! Please enjoy the authentic scientific modeling experience shared by tens of thousands of researchers and hundreds of thousands of students worldwide.',
  logoUrl: assets['icon/turtle-universe'],
  iconUrl: assets['icon/turtle-universe'],
  iconName: 'netlogo-netlogo-desktop',
  productExternalHomePage: 'https://www.turtlesim.com',
  prerequisites: [{ type: 'product', value: 'netlogo' }],
};

export {
  behaviorSearchProduct,
  hubnetWebProduct,
  netlogo3dProduct,
  netlogoProduct,
  netLogoWebProduct,
  nettangoProduct,
  turtleUniverseProduct,
};
