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
  },
});
