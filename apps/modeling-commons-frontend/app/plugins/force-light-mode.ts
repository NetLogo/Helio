export default defineNuxtPlugin((nuxtApp) => {
  const colorMode = useColorMode();
  nuxtApp.hook("app:mounted", () => {
    colorMode.forced = true;
    // @ts-expect-error -- backwards compatability
    colorMode.preference = "light";
    // @ts-expect-error -- backwards compatability
    colorMode.value = "light";
  });
});
