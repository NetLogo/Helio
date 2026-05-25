import { passkeyClient } from "@better-auth/passkey/client";
import type {
  BetterAuthClientOptions,
  BetterAuthClientPlugin,
  IsSignal,
  UnionToIntersection,
  User as _User,
} from "better-auth";
import type { InferActions } from "better-auth/client";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";
import type { DeepReadonly } from "vue";

const userAdditionalFields = {
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
} as const;

export type User = _User & InferUserAdditionalFields<(typeof userAdditionalFields)["user"]>;
export default defineNuxtPlugin({
  name: "auth",
  enforce: "pre",
  async setup(nuxtApp) {
    const headers = useRequestHeaders(["cookie"]);

    const plugins = [adminClient(), inferAdditionalFields(userAdditionalFields)];

    const authClient = createAuthClient({
      baseURL: useRuntimeConfig().public.authApiBase,
      fetchOptions: {
        credentials: "include",
        headers,
      },

      // The passkey client type inference is broken, which cascades to
      // the client, breaking type checking. This is a workaround to ensure
      // *most* type safety is preserved.
      // -Omar Ibrahim, Apr 30 26
      plugins: [...plugins, passkeyClient()] as typeof plugins,
    });

    // We have to do this dance because better-auth doesn't allow us to
    // provide a custom fetch implementation at the plugin level, which means
    // we can't ensure the auth plugin's fetch calls include the necessary
    // headers for our application.
    // -Omar Ibrahim, May 01 26
    const useFetchHeaders = new Proxy(useFetch, {
      apply(target, thisArg, argArray) {
        const [input, options] = argArray as Parameters<typeof useFetch>;

        const mergedOptions = {
          ...options,
          headers: {
            ...(options?.headers ?? {}),
            ...headers,
          },
          credentials: "include",
        };

        return Reflect.apply(target, thisArg, [input, mergedOptions]);
      },
    });

    const session = await nuxtApp.runWithContext(() => authClient.useSession(useFetchHeaders));

    const refresh = () => {
      try {
        authClient.getSession({ fetchOptions: { headers, credentials: "include" } });
      } catch (error) {
        console.error("Failed to refresh session:", error);
      }
    };

    return {
      provide: {
        auth: {
          // We have to manually fill-in the PasskeyClient types here
          // because of the aforementioned inference issue.
          // --Omar Ibrahim, May 01 26
          client: authClient as typeof authClient & ExtendWithPlugin<typeof passkeyClient>,
          session,
          refresh,
        },
      },
    };
  },
});

// Type helpers
type InferUserAdditionalFields<T> = T extends {
  [K in keyof T]: infer Field;
}
  ? {
      [K in keyof T]: Field extends { type: "string" }
        ? string | null
        : Field extends { type: "boolean" }
          ? boolean
          : Field extends { type: "date" }
            ? Date | null
            : Field extends { type: "json" }
              ? ReturnType<typeof JSON.parse> | null
              : never;
    }
  : never;

type InferResolvedHooks<O extends BetterAuthClientOptions> = O extends {
  plugins: Array<infer Plugin>;
}
  ? UnionToIntersection<
      Plugin extends BetterAuthClientPlugin
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Plugin["getAtoms"] extends (fetch: any) => infer Atoms
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Atoms extends Record<string, any>
            ? {
                [key in keyof Atoms as IsSignal<key> extends true
                  ? never
                  : key extends string
                    ? `use${Capitalize<key>}`
                    : never]: () => DeepReadonly<Ref<ReturnType<Atoms[key]["get"]>>>;
              }
            : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
              {}
          : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
            {}
        : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
          {}
    >
  : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtendWithPlugin<O extends (...args: any[]) => BetterAuthClientPlugin> = InferResolvedHooks<{
  plugins: [ReturnType<O>];
}> &
  InferActions<{
    plugins: [ReturnType<O>];
  }>;
