export default defineAppConfig({
  ui: {
    colors: {
      neutral: "slate",
      important: "violet",
    },

    container: {
      base: "max-w-[110ch] mx-auto px-0 mx-auto px-[var(--space-xl)] lg:px-0",
    },

    breadcrumb: {
      slots: {
        list: "[&_li]:m-0! p-0",
      },
    },

    contentNavigation: {
      slots: {
        list: "mx-0 px-2 lg:mt-[var(--block-top)]",
        listWithChildren: "px-0",
      },
    },
    contentToc: {
      slots: {
        root: "px-0! w-full -mx-0",
        trailing: "hidden",
        title:
          "w-full px-[var(--space-lg)] py-2 bg-[var(--secondary-heading-background-color)] text-[var(--secondary-heading-text-color)] w-full",
      },
    },
    pageAside: {
      slots: {
        root: "pt-0",
      },
    },
    blogPost: {
      slots: {
        footer: "p-4 sm:p-6",
      },
    },
  },
});
