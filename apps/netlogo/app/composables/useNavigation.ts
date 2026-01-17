import { computed, ref } from "vue";
import NetLogoAPI, { type NavigationSection } from "~/utils/api";

export interface NavbarLink {
  title: string;
  href: string;
  columns?: number;
  children?: Array<Omit<NavbarLink, "children">>;
  active?: boolean;
}

/**
 * Composable to fetch and manage navigation data from the Directus backend
 */
export function useNavigation() {
  const config = useRuntimeConfig();
  const navigationSections = ref<NavigationSection[]>([]);
  const isLoading = ref(true);
  const error = ref<Error | null>(null);

  /**
   * Transform API navigation sections into NavbarLink format
   */
  const navbarLinks = computed<NavbarLink[]>(() => {
    return navigationSections.value.map((section) => {
      const children = section.items
        .filter((item) => item.url !== section.items[0]?.url) // Exclude first item if it's the parent link
        .map((item) => ({
          title: item.display_title,
          href: item.url,
          active: false,
        }));

      return {
        title: section.name,
        href: section.items[0]?.url || "/",
        columns: children.length > 6 ? 2 : undefined,
        children: children.length > 0 ? children : undefined,
        active: false,
      };
    });
  });

  /**
   * Get footer navigation items (items with in_footer = true)
   */
  const footerLinks = computed(() => {
    const links: Array<{ title: string; href: string }> = [];
    navigationSections.value.forEach((section) => {
      section.items
        .filter((item) => item.in_footer)
        .forEach((item) => {
          links.push({
            title: item.display_title,
            href: item.url,
          });
        });
    });
    return links;
  });

  /**
   * Fetch navigation data from the Directus backend
   */
  async function fetchNavigation() {
    isLoading.value = true;
    error.value = null;

    try {
      const api = new NetLogoAPI(config.public.backendUrl as string);
      const data = await api.getNavigationData();
      navigationSections.value = data.navigation_sections;
    } catch (e) {
      console.error("Failed to fetch navigation data:", e);
      error.value = e instanceof Error ? e : new Error("Unknown error");
      // Fallback to default navigation
      navigationSections.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  return {
    navigationSections,
    navbarLinks,
    footerLinks,
    isLoading,
    error,
    fetchNavigation,
  };
}
