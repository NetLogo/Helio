export default defineAppConfig({
  ui: {
    colors: {
      neutral: "slate",
      important: "violet",
    },

    container: {
      base: "max-w-[150ch] px-4 lg:px-24 mx-auto",
    },

    input: {
      slots: {
        root: "w-full",
        base: "py-2!",
      },
    },

    formField: {
      slots: {
        label: "font-bold text-lg",
      },
      variants: {
        orientation: {
          horizontal: {
            root: "grid grid-cols-12 gap-4 items-center [&>:first-child]:col-span-12 sm:[&>:first-child]:col-span-3 [&>:nth-child(2)]:col-span-12 sm:[&>:nth-child(2)]:col-span-9 [&>:nth-child(2)]:w-full",
          },
        },
      },
    },
  },
});
