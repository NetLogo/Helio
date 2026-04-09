export default defineNuxtPlugin((nuxtApp) => {
  const colorMode = useColorMode();
  nuxtApp.hook("app:mounted", () => {
    colorMode.forced = true;
    // @ts-expect-error - preference may or may not exist depending
    // on how @nuxtjs/color-mode was installed
    colorMode.preference = "light";
    // @ts-expect-error - see above
    colorMode.value = "light";
  });
});
