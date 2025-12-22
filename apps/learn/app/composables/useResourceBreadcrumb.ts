import type { ResourcesCollectionItem } from '@nuxt/content';

function useResourceBreadcrumb(resource?: ResourcesCollectionItem) {
  const crumb = ref([
    { label: 'NetLogo Learn', to: '/', icon: 'i-lucide-box' },
    { label: 'Resources', to: '/resources', icon: 'i-lucide-bookmark' },
  ]);

  watchEffect(() => {
    if (resource) {
      const { kind } = useResourceHelpers(resource);
      crumb.value = [
        { label: 'NetLogo Learn', to: '/', icon: 'i-lucide-box' },
        { label: 'Resources', to: '/resources', icon: 'i-lucide-bookmark' },
        { label: kind.value.label, to: `/resources?type=${kind.value.label}`, icon: kind.value.icon },
        { label: resource.title, to: addLeadingSlash(resource.stem), icon: 'i-lucide-file-text' },
      ];
    }
  });

  return crumb;
}

export { useResourceBreadcrumb };
