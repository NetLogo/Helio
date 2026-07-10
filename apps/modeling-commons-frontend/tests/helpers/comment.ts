import { mountSuspended } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";
import { computed, ref } from "vue";
import CommentView from "~/components/comment/CommentView.vue";
import CommentsPanel from "~/components/comment/CommentsPanel.vue";
import type { Comment, CommentViewSettings, CommentsPanelProps } from "~/components/comment/types";
import { makeSession, makeUser } from "./fixtures";

const loggedIn = ref(true);

const currentUser = computed(() => {
  if (!loggedIn.value) {
    return { session: null, isLoggedIn: false as const, user: null };
  }
  const user = makeUser();
  return { ...user, session: makeSession(user.id), isLoggedIn: true as const, user };
});

export const toastAddMock = vi.fn();

export function useUserMock() {
  return currentUser;
}

export function useProfileMock() {
  return { profile: computed(() => currentUser.value.user), refresh: vi.fn() };
}

export function useToastMock() {
  return { add: toastAddMock, remove: vi.fn(), update: vi.fn(), clear: vi.fn() };
}

export function setLoggedIn(value: boolean) {
  loggedIn.value = value;
}

export function resetCommentMocks() {
  loggedIn.value = true;
  toastAddMock.mockClear();
}

export function mountCommentsPanel(
  comments: Array<Comment>,
  overrides: Partial<CommentsPanelProps> = {},
) {
  return mountSuspended(CommentsPanel, {
    props: {
      comments,
      pagination: { count: comments.length, lastPage: 1 },
      ...overrides,
    },
  });
}

export function mountCommentView(comment: Comment, overrides: Partial<CommentViewSettings> = {}) {
  return mountSuspended(CommentView, {
    props: { comment, ...overrides },
  });
}
