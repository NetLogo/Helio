export default defineNuxtConfig({
  mdc: {
    components: {
      prose: false,
      map: {
        Icon: "MDCIcon",
        Container: "MDCContainer",
        ErrorBanner: "MDCErrorBanner",
        Button: "MDCButton",
        Flex: "MDCFlex",
        NetlogoCommand: "NetLogoCommand",
        a: "ProseA",
      },
    },
  },
});
