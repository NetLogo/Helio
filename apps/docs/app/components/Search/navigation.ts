import { MetadataSchema } from "~~/lib/docs/schema";

export function rewriteTitle(item: NavigationItem): string {
  const title = item.seo?.title || item.title;
  const meta = MetadataSchema.safeParse(item.meta);

  if (title.includes(" Extension Dictionary:")) {
    return title.replace(/ Extension Dictionary/, "");
  }

  if (meta.data && meta.data.extensionName && meta.data.layout === "default") {
    return meta.data.extensionName.fullName;
  }

  if (item.children?.length) {
    const firstChild = item.children[0];
    if (firstChild && firstChild.title.includes(" Extension Dictionary")) {
      return firstChild.title.replace(/ Extension Dictionary.+/, "");
    }
  }

  switch (title) {
    case "Dict":
      return "NetLogo Dictionary";
    default:
      return title;
  }
}

export function recompose(items: Array<NavigationItem>): NavigationItem[] {
  const documentationGroup: NavigationItem = {
    path: "/",
    title: "Documentation",
    children: items.filter((item) => filters.rootPage(item) && !filters.tutorial(item)),
  };

  const tutorialGroup: NavigationItem = {
    path: "/sample",
    title: "Learn NetLogo",
    children: items.filter(filters.tutorial),
  };

  const extensionsGroup = items.filter((item) => filters.extensions(item))[0]!;
  const rest = items.filter((item) => !filters.extensions(item));

  return [documentationGroup, tutorialGroup, extensionsGroup, ...rest];
}

export function applyTitleRewrite(item: NavigationItem): NavigationItem {
  return {
    ...item,
    title: rewriteTitle(item),
    children: item.children?.map((c) => applyTitleRewrite(c)),
  };
}

export function applyIcons(item: NavigationItem): NavigationItem {
  const meta = MetadataSchema.safeParse(item.meta || {});
  return { ...item, icon: meta.data?.icon, children: item.children?.map((c) => applyIcons(c)) };
}

export function applyDescriptions(item: NavigationItem): NavigationItem {
  const meta = MetadataSchema.safeParse(item.meta || {});
  return {
    ...item,
    description: meta.data?.description,
    children: item.children?.map((c) => applyDescriptions(c)),
  };
}

export async function getNavigationItems(
  query: () => ReturnType<typeof queryCollectionNavigation>,
) {
  try {
    const response = await query();
    const result = recompose(response).map((item) => {
      return applyIcons(applyDescriptions(applyTitleRewrite(item)));
    });
    return result;
  } catch (e) {
    console.error("Error fetching navigation items:", e);
    return [];
  }
}

export const filters = {
  noH1: (file: { id: string; level?: number }) => !(file.id.includes("#") && file.level === 1),
  noCatalogIndex: (file: Pick<NavigationItem, "title">) =>
    !file.title.includes(" Dictionary: index"),
  tutorial: (file: Pick<NavigationItem, "stem">) =>
    file.stem === "sample" || file.stem?.startsWith("tutorial"),
  rootPage: (file: Pick<NavigationItem, "page" | "children">) =>
    !(Boolean(file.page) || file.children?.length),
  extensions: (file: Pick<NavigationItem, "stem">) => file.stem === "extensions",
};

type CoreNavigationItem = {
  path: string;
  stem?: string;
  title: string;
  children?: Array<NavigationItem>;
  page?: boolean;
};

type MetaNavigationProps = {
  id?: string | number;
  meta?: unknown;
  seo?: { title: string; description: string };
  icon?: string;
  description?: string;
};

type NavigationItem = CoreNavigationItem & MetaNavigationProps;
