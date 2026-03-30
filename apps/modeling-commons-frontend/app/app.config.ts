export default defineAppConfig({
  ui: {
    colors: {
      neutral: "slate",
      important: "violet",
    },

    container: {
      base: "max-w-[150ch] px-4 lg:px-24 py-12 mx-auto",
    },

    input: {
      slots: {
        root: "w-full",
        base: "py-2!",
      },
    },
  },
});
