import type { Session, User } from "better-auth";

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
    session.value?.data?.user
      ? ({
          ...session.value.data.user,
          session: session.value.data.session,
          isLoggedIn: true,
          user: session.value.data.user,
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
