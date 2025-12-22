export type TagInfo = {
  tagName: string;
  subtitle: (target?: string) => string;
  icon: string;
  title: string;
  startsWith: string;
  path: string;
};

const tagMap: Record<string, TagInfo> = {
  all: {
    tagName: 'All',
    icon: 'i-lucide-layers',
    title: 'All Articles & Tutorials',
    subtitle: () => 'Explore all available learning resources in one place.',
    startsWith: '/published/all',
    path: '/published/all',
  },
  'getting-started': {
    tagName: 'Getting Started',
    icon: 'i-lucide-rocket',
    title: 'Getting Started',
    subtitle: () => 'Essential resources to kickstart your journey with NetLogo.',
    startsWith: '/getting-started',
    path: '/published/getting-started',
  },
  articles: {
    tagName: 'Article',
    icon: 'i-lucide-file-text',
    title: 'Articles',
    subtitle: (target = 'NetLogo products') => `Guides in various levels of difficulty on how to use ${target}.`,
    startsWith: '/articles',
    path: '/published/articles',
  },
  tutorials: {
    tagName: 'Tutorial',
    icon: 'i-lucide-book-open',
    title: 'Tutorials',
    subtitle: () => 'Step-by-step guides to sharpen your skills.',
    startsWith: '/tutorials',
    path: '/published/tutorials',
  },
  'video-tutorials': {
    tagName: 'Video Tutorial',
    icon: 'i-lucide-video',
    title: 'Video Tutorials',
    subtitle: () => 'Engaging video content to enhance your learning experience.',
    startsWith: '/video-tutorials',
    path: '/published/video-tutorials',
  },
  'learning-paths': {
    tagName: 'Learning Path',
    icon: 'i-lucide-map',
    title: 'Learning Paths',
    subtitle: () => 'Curated articles, tutorials and videos to help you learn more effectively.',
    startsWith: '/learning-paths',
    path: '/learning-paths',
  },
};

export type TagKey = keyof typeof tagMap;

export function getTagIcon(tag: TagKey): string {
  return tagMap[tag]!.icon;
}

export function getTagTitle(tag: TagKey): string {
  return tagMap[tag]!.title;
}

export function getTagName(tag: TagKey): string {
  return tagMap[tag]!.tagName;
}

export function getTagSubtitle(tag: TagKey, target?: string): string {
  return tagMap[tag]!.subtitle(target);
}

export function getTagInfo(tag: TagKey): TagInfo {
  return tagMap[tag]!;
}

export function getTagsInfo(): TagInfo[] {
  return Object.values(tagMap);
}

export function getTagsRecord(): Record<string, TagInfo> {
  return tagMap;
}
