import { computed, ref } from "vue";
import NetLogoAPI, { type NavigationSection } from "~/utils/api";

export interface NavbarLink {
  title: string;
  href: string;
  columns?: number;
  children?: Array<Omit<NavbarLink, "children">>;
  active?: boolean;
}

export async function useNavigation() {
  const config = useRuntimeConfig();
  const navigationSections = ref<NavigationSection[]>([]);

  const { data } = await useAsyncData("nav-data", async () => {
    const api = new NetLogoAPI(config.public.backendUrl as string);
    return await api.getNavigationData();
  });

  if (data.value) {
    navigationSections.value = data.value.navigation_sections;
  }

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

  const footerSections = computed(() => {
    return navigationSections.value
      .map((section) => {
        const links = section.items
          .filter((item) => item.in_footer)
          .map((item) => ({
            title: item.display_title,
            href: item.url,
            external: false,
          }));

        return links.length > 0
          ? {
              title: section.name,
              links,
            }
          : null;
      })
      .filter((section) => section !== null);
  });

  return {
    navigationSections,
    navbarLinks,
    footerSections,
  };
}
