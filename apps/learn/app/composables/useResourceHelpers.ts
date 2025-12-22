import type { ResourcesCollectionItem } from '@nuxt/content';

export function useResourceHelpers(resource: Ref<ResourcesCollectionItem> | ResourcesCollectionItem) {
  const resourceValue = isRef(resource) ? resource : ref(resource);

  const badgeText = computed(() => {
    if (resourceValue.value.endorsement === 'official') return 'Official Resource';
    if (resourceValue.value.endorsement === 'endorsed') return 'Endorsed';
    return null;
  });

  const badgeClass = computed(() => {
    if (resourceValue.value.endorsement === 'official' || resourceValue.value.endorsement === 'endorsed') {
      return 'bg-success ring-0 text-white';
    }
    return 'bg-gray-500 ring-0 text-white';
  });

  const kind = computed(() => {
    switch (resourceValue.value.type) {
      case 'book':
        return { icon: 'i-lucide-bookmark', label: 'Book' };
      case 'website':
        return { icon: 'i-lucide-globe', label: 'Website' };
      case 'course':
        return { icon: 'i-lucide-video', label: 'Course' };
      case 'sample curriculum':
        return { icon: 'i-lucide-library', label: 'Sample Curriculum' };
      case 'dataset':
        return { icon: 'i-lucide-database', label: 'Dataset' };
      case 'software resource': {
        switch (resourceValue.value.softwareResourceKind) {
          case 'model library':
            return { icon: 'i-lucide-box', label: 'Model Library' };
          case 'package':
            return { icon: 'i-lucide-package', label: 'Package' };
          case 'extension':
            return { icon: 'i-lucide-puzzle', label: 'Extension' };
          default:
            return { icon: 'i-lucide-cpu', label: 'Software Resource' };
        }
      }
      case 'paper':
        return { icon: 'i-lucide-file-text', label: 'Paper' };
      default:
        return { icon: 'i-lucide-bookmark', label: 'Bookmark' };
    }
  });

  const pricingColor = computed(() => {
    switch (resourceValue.value.pricing) {
      case 'free':
        return 'success';
      case 'paid':
        return 'warning';
      case 'freemium':
        return 'info';
      default:
        return 'neutral';
    }
  });

  function formatSize(sizeKB: number): string {
    if (sizeKB < 1024) return `${sizeKB} KB`;
    const sizeMB = sizeKB / 1024;
    if (sizeMB < 1024) return `${sizeMB.toFixed(1)} MB`;
    const sizeGB = sizeMB / 1024;
    return `${sizeGB.toFixed(2)} GB`;
  }

  return {
    badgeText,
    badgeClass,
    pricingColor,
    formatSize,
    kind,
  };
}
