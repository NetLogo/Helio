import { createAuthClient } from "better-auth/vue";
import { passkeyClient } from "@better-auth/passkey/client";
import { adminClient } from "better-auth/client/plugins";

export default defineNuxtPlugin({
  name: "auth",
  enforce: "pre",
  setup(nuxtApp) {
    const authClient = createAuthClient({
      baseURL: useRuntimeConfig().public.authApiBase,
      plugins: [adminClient(), passkeyClient()],
    });

    const session = nuxtApp.runWithContext(() => authClient.useSession());

    return {
      provide: {
        auth: {
          client: authClient,
          session,
        },
      },
    };
  },
});
