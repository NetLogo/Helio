import { passkeyClient } from "@better-auth/passkey/client";
import type {
  BetterAuthClientOptions,
  BetterAuthClientPlugin,
  IsSignal,
  UnionToIntersection,
} from "better-auth";
import type { InferActions } from "better-auth/client";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";
import type { DeepReadonly } from "vue";

export default defineNuxtPlugin({
  name: "auth",
  enforce: "pre",
  async setup(nuxtApp) {
    const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

    const plugins = [
      adminClient(),
      inferAdditionalFields({
        user: {
          systemRole: {
            type: "string",
            input: false,
          },
          userKind: {
            type: "string",
            required: false,
          },
          isProfilePublic: {
            type: "boolean",
          },
          onboardedAt: {
            type: "date",
            required: false,
            input: false,
          },
          bio: {
            type: "string",
            required: false,
          },
          country: {
            type: "string",
            required: false,
          },
          socialLinks: {
            type: "json",
            required: false,
          },
          dob: {
            type: "date",
            required: false,
          },
          affiliation: {
            type: "string",
            required: false,
          },
        },
      }),
    ];

    const authClient = createAuthClient({
      baseURL: useRuntimeConfig().public.authApiBase,
      fetchOptions: {
        credentials: "include",
        headers,
      },
      // The passkey client type inference is broken, which cascades to
      // the client, breaking type checking. This is a workaround to ensure
      // *most* type safety is preserved.
      // -- Omar Ibrahim, Apr 30 26
      plugins: [...plugins, passkeyClient()] as typeof plugins,
    });

    const reactiveSession = await nuxtApp.runWithContext(() => authClient.useSession());
    const session = ref({ ...reactiveSession.value });
    watch(
      reactiveSession,
      (next) => {
        session.value = { ...next };
      },
      { deep: true },
    );

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
          // We have to manually fill-in the PasskeyClient types here
          // because of the aforementioned inference issue.
          // --Omar Ibrahim, May 01 26
          client: authClient as typeof authClient & ExtendWithPlugin<typeof passkeyClient>,
          session,
        },
      },
    };
  },
});

// Type helpers
type InferResolvedHooks<O extends BetterAuthClientOptions> = O extends {
  plugins: Array<infer Plugin>;
}
  ? UnionToIntersection<
      Plugin extends BetterAuthClientPlugin
        ? Plugin["getAtoms"] extends (fetch: any) => infer Atoms
          ? Atoms extends Record<string, any>
            ? {
                [key in keyof Atoms as IsSignal<key> extends true
                  ? never
                  : key extends string
                    ? `use${Capitalize<key>}`
                    : never]: () => DeepReadonly<Ref<ReturnType<Atoms[key]["get"]>>>;
              }
            : {}
          : {}
        : {}
    >
  : {};

type ExtendWithPlugin<O extends (...args: any[]) => BetterAuthClientPlugin> = InferResolvedHooks<{
  plugins: [ReturnType<O>];
}> &
  InferActions<{
    plugins: [ReturnType<O>];
  }>;
