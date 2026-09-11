export default defineAppConfig({
  ui: {
    colors: {
      primary: "#0670ed",
      neutral: "slate",
      important: "red",
    },
    pageHero: {
      slots: {
        container: "py-10 sm:py-20 lg:py-20",
        title: "sm:text-5xl",
      },
    },
    pageAside: {
      slots: {
        root: "pt-0",
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
        container: "pt-0!",
        trailing: "hidden",
        listWithChildren: "p-0 [&>li]:ms-0 mb-1",
      },
    },
  },
});
