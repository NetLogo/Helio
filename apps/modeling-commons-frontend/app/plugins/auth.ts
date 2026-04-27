import { createAuthClient } from "better-auth/vue";
import { passkeyClient } from "@better-auth/passkey/client";
import { adminClient } from "better-auth/client/plugins";

export default defineNuxtPlugin({
  name: "auth",
  enforce: "pre",
  async setup(nuxtApp) {
    const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

    const authClient = createAuthClient({
      baseURL: useRuntimeConfig().public.authApiBase,
      plugins: [adminClient(), passkeyClient()],
      fetchOptions: {
        credentials: "include",
        headers,
      },
    });

    const session = nuxtApp.runWithContext(() => authClient.useSession());

    if (import.meta.server) {
      const { data } = await authClient.getSession({
        fetchOptions: { headers },
      });
      session.value = { ...session.value, data, isPending: false };
      nuxtApp.payload.authSession = data;
    } else if (nuxtApp.payload.authSession !== undefined) {
      session.value = {
        ...session.value,
        data: nuxtApp.payload.authSession as typeof session.value.data,
        isPending: false,
      };
    }

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
