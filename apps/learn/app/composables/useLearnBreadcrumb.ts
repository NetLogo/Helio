export function useLearnBreadcrumb(someCrumbets?: Ref<Array<{ label: string; to: string; icon?: string }>>) {
  const crumb = computed(() => [
    { label: 'NetLogo Learn', to: '/', icon: 'i-lucide-box' },
    ...(someCrumbets?.value ?? []),
  ]);
  return crumb;
}
