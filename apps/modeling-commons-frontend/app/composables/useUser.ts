import type { User, Session } from "better-auth";

type AuthenticatedUser =
  | (User & {
      session: Session;
      isLoggedIn: true;
      user: User;
    })
  | {
      session: null;
      isLoggedIn: false;
      user: null;
    };

function useUser(): Readonly<ComputedRef<AuthenticatedUser>> {
  const auth = useNuxtApp().$auth;
  const session = auth.session;

  const user = computed(() =>
    session.value?.data?.user
      ? {
          ...session.value.data.user,
          session: session.value.data.session,
          isLoggedIn: !!session.value.data.user,
        }
      : {
          session: null,
          isLoggedIn: false,
        },
  );

  return user;
}

function isLoggedIn(
  user: AuthenticatedUser,
): user is Extract<AuthenticatedUser, { isLoggedIn: true }> {
  return user.isLoggedIn;
}

export default useUser;
export { isLoggedIn };
export type { AuthenticatedUser };
