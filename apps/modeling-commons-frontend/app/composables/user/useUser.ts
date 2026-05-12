import type { Session } from "better-auth";
import type { User } from "~/plugins/auth";

type LoggedOutUser = {
  session: null;
  isLoggedIn: false;
  user: null;
};

type LoggedInUser = User & {
  session: Session;
  isLoggedIn: true;
  user: User;
};
type AuthenticatedUser = LoggedOutUser | LoggedInUser;
function useUser(): Readonly<ComputedRef<AuthenticatedUser>> {
  const auth = useNuxtApp().$auth;
  const session = auth.session;

  const user = computed(() =>
    session.data.value?.user
      ? ({
          ...session.data.value.user,
          session: session.data.value.session,
          isLoggedIn: true,
          user: session.data.value.user,
        } as LoggedInUser)
      : ({
          session: null,
          isLoggedIn: false,
          user: null,
        } as LoggedOutUser),
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
