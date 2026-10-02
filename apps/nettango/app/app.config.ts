export default defineAppConfig({
  ui: {
    tv: {
      twMergeConfig: {
        extend: {
          classGroups: {
            "font-size": [
              { text: ["ui-sm", "ui-md", "lede", "lede-lg", "display-sm", "display-md", "display-lg"] },
            ],
          },
        },
      },
    },
    colors: {
      primary: "nt-blue",
      neutral: "slate",
      important: "red",
    },
    pageSection: {
      slots: {
        root: "border-t border-default",
        container: "py-10 sm:py-14 lg:py-16",
      },
    },
    button: {
      compoundVariants: [
        {
          color: "primary",
          variant: "solid",
          size: "xl",
          class:
            "rounded-xl h-14 px-7 text-ui-md font-semibold shadow-press transition-[transform,translate,box-shadow,background-color] hover:bg-primary hover:-translate-y-0.5 active:bg-primary active:translate-y-0.5 active:shadow-press-sm motion-reduce:transition-none",
        },
        {
          color: "primary",
          variant: "solid",
          size: "lg",
          class:
            "rounded-lg h-10 pl-3 pr-4 text-ui-sm font-semibold shadow-press-sm transition-[transform,translate,box-shadow,background-color] hover:bg-primary-600 active:bg-primary active:translate-y-px active:shadow-none motion-reduce:transition-none",
        },
      ],
    },
    badge: {
      defaultVariants: {
        variant: "outline",
      },
    },
    accordion: {
      slots: {
        trigger: "text-base",
      },
    },
    card: {
      slots: {
        root: "rounded-xl",
        body: "p-4 sm:p-5",
      },
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
