export default defineAppConfig({
  ui: {
    colors: {
      neutral: "slate",
      important: "violet",
    },

    container: {
      base: "max-w-[var(--max-width-ch)] px-4  py-12 mx-auto",
    },

    input: {
      slots: {
        root: "w-full",
        base: "py-2!",
      },
    },
  },
});
