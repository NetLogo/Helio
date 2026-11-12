import type { MaybeRefOrGetter } from "vue";
import { useDebounceFn, useDocumentVisibility } from "@vueuse/core";
import {
  findCommentById,
  hasLoadedBeyond,
  insertReply,
  mergeLoadedPages,
  mergePinnedComments,
  nextPageToLoad,
  removeCommentById,
  updateCommentById,
} from "~/components/comment/comment-tree";
import {
  COMMENT_STREAM_REFRESH_DEBOUNCE_MS,
  type Comment,
  type CommentPagination,
} from "~/components/comment/types";
import { commentLiterals } from "~/features/comments/literals";
import useComments from "./useComments";
import type { CommentsSource } from "./useComments";

type UseCommentThreadOptions = {
  source: MaybeRefOrGetter<CommentsSource>;
  sort?: MaybeRefOrGetter<CommentSort | undefined>;
};

export default function useCommentThread(options: UseCommentThreadOptions) {
  const {
    comments: sourceComments,
    pagination: sourcePagination,
    status,
    refresh,
    loaded,
  } = useComments(options.source, options.sort);

  const modelId = computed(() => toValue(options.source).modelId);

  const snapshot = computed<CommentsPayload>(() => ({
    comments: sourceComments.value,
    pagination: sourcePagination.value,
  }));

  const local = reactive<CommentsPayload>({
    comments: [],
    pagination: { count: 0, lastPage: null },
  });

  const pinnedIds = new Set<string>();
  let sourceChanged = false;
  watch(
    () => [modelId.value, toValue(options.source).commentId, toValue(options.sort)],
    () => {
      pinnedIds.clear();
      sourceChanged = true;
    },
  );

  const applySnapshot = (next: CommentsPayload) => {
    const firstPage = mergePinnedComments(
      local.comments,
      next.comments,
      pinnedIds,
      next.pagination.count <= next.comments.length,
    );
    if (sourceChanged) {
      sourceChanged = false;
      Object.assign(local, { comments: firstPage, pagination: { ...next.pagination } });
      return;
    }
    const keepLaterPages = hasLoadedBeyond(local.pagination, next.pagination, next.comments.length);
    Object.assign(local, {
      comments: mergeLoadedPages(local.comments, firstPage, keepLaterPages),
      pagination: keepLaterPages
        ? { ...next.pagination, lastPage: local.pagination.lastPage }
        : { ...next.pagination },
    });
  };

  watch(snapshot, applySnapshot, { immediate: true });

  if (import.meta.server) {
    onServerPrefetch(async () => {
      await loaded;
      applySnapshot(snapshot.value);
    });
  }

  const toast = useToast();
  const mutations = useCommentMutations(() => modelId.value);

  const notifyFailure = () =>
    toast.add({
      title: commentLiterals.saveFailedToastTitle,
      description: commentLiterals.saveFailedToastDescription,
      color: "error",
      icon: "i-lucide-triangle-alert",
    });

  const busy = ref(false);
  const pending = ref(false);
  const submitToken = ref(0);

  const runOptimistic = async (apply: () => void, persist: () => Promise<void>) => {
    if (busy.value || pending.value) return;
    busy.value = true;
    const rollback = { comments: local.comments, pagination: { ...local.pagination } };
    try {
      apply();
      await persist();
    } catch {
      local.comments = rollback.comments;
      local.pagination = rollback.pagination;
      notifyFailure();
    } finally {
      busy.value = false;
    }
  };

  const runSubmission = async (persist: () => Promise<void>): Promise<boolean> => {
    if (pending.value || busy.value) return false;
    pending.value = true;
    try {
      await persist();
      submitToken.value += 1;
      return true;
    } catch {
      notifyFailure();
      return false;
    } finally {
      pending.value = false;
    }
  };

  // Confirm a just-created comment by fetching it back by id, then hand it to
  // the caller to place in the tree. Falls back to a full refetch only if the
  // read-back fails, so the new comment is never silently dropped.
  const confirmCreated = async (
    persistedId: string,
    place: (created: Comment) => void,
  ): Promise<void> => {
    const created = await fetchComment(modelId.value, persistedId, {});
    if (created) place(created);
    else await refresh();
  };

  const create = ({ content }: { content: string }) =>
    runSubmission(async () => {
      const { id } = await mutations.create({ content });
      await confirmCreated(id, (created) => {
        local.comments = [created, ...local.comments];
        pinnedIds.add(created.id);
        local.pagination = { ...local.pagination, count: local.pagination.count + 1 };
      });
    });

  const reply = ({ commentId, content }: { commentId: string; content: string }) =>
    runSubmission(async () => {
      const { id } = await mutations.create({ content, parentId: commentId });
      await confirmCreated(id, (created) => {
        local.comments = insertReply(local.comments, commentId, created);
        pinnedIds.add(created.id);
      });
    });

  // A refresh only refetches the first page, so a changed comment on a later
  // loaded page is read back by id.
  const reloadComment = async (commentId: string): Promise<void> => {
    const fresh = await fetchComment(modelId.value, commentId, {});
    local.comments = fresh
      ? updateCommentById(local.comments, commentId, (shown) => ({
          ...fresh,
          replies: shown.replies,
          replyPagination: shown.replyPagination,
        }))
      : removeCommentById(local.comments, commentId);
  };

  const edit = ({ commentId, content }: { commentId: string; content: string }) =>
    runSubmission(async () => {
      await mutations.edit({ commentId, content });
      await reloadComment(commentId);
      await refresh();
    });

  const remove = async ({ commentId }: { commentId: string }) => {
    const ok = await runSubmission(async () => {
      await mutations.remove({ commentId });
      await reloadComment(commentId);
      await refresh();
    });
    if (ok) {
      toast.add({
        title: commentLiterals.deletedToastTitle,
        description: commentLiterals.deletedToastDescription,
        color: "success",
        icon: "lucide:message-circle",
      });
    }
    return ok;
  };

  const like = ({ commentId }: { commentId: string }) => {
    runOptimistic(
      () => {
        local.comments = updateCommentById(local.comments, commentId, (comment) => ({
          ...comment,
          likes: comment.likes + 1,
          likedByMe: true,
        }));
      },
      () => mutations.like({ commentId }),
    );
  };

  const unlike = ({ commentId }: { commentId: string }) => {
    runOptimistic(
      () => {
        local.comments = updateCommentById(local.comments, commentId, (comment) => ({
          ...comment,
          likes: Math.max(0, comment.likes - 1),
          likedByMe: false,
        }));
      },
      () => mutations.unlike({ commentId }),
    );
  };

  const loadReplies = async ({ commentId }: { commentId: string }) => {
    if (busy.value || pending.value || !modelId.value) return;
    const target = findCommentById(local.comments, commentId);
    if (!target) return;
    busy.value = true;
    try {
      const loaded = target.replyPagination;
      const nextPage = nextPageToLoad(loaded);
      const root = await fetchComment(modelId.value, commentId, {
        page: nextPage,
        limit: loaded?.limit,
      });
      if (!root) return;
      const fetched = root.replies ?? [];
      local.comments = updateCommentById(local.comments, commentId, (comment) => {
        const seen = new Set((comment.replies ?? []).map((reply) => reply.id));
        const added = fetched.filter((reply) => !seen.has(reply.id));
        return {
          ...comment,
          replies: [...(comment.replies ?? []), ...added],
          replyPagination: {
            count: root.replyPagination?.count ?? comment.replyPagination?.count ?? 0,
            limit: root.replyPagination?.limit ?? comment.replyPagination?.limit,
            lastPage: nextPage,
          },
        };
      });
    } catch {
      notifyFailure();
    } finally {
      busy.value = false;
    }
  };

  const loadMore = async (current: CommentPagination) => {
    if (busy.value || pending.value || !modelId.value) return;
    busy.value = true;
    try {
      const next = await fetchModelComments(modelId.value, {
        page: nextPageToLoad(current),
        limit: current.limit,
        sort: toValue(options.sort),
      });
      const seen = new Set(local.comments.map((comment) => comment.id));
      const added = next.comments.filter((comment) => !seen.has(comment.id));
      local.comments = [...local.comments, ...added];
      local.pagination = next.pagination;
    } catch {
      notifyFailure();
    } finally {
      busy.value = false;
    }
  };

  if (import.meta.client) {
    const visibility = useDocumentVisibility();
    let missedWhileBusy = false;
    const debouncedRefresh = useDebounceFn(() => {
      if (!busy.value && !pending.value) return refresh();
      missedWhileBusy = true;
    }, COMMENT_STREAM_REFRESH_DEBOUNCE_MS);
    watch(
      () => busy.value || pending.value,
      (active) => {
        if (active || !missedWhileBusy) return;
        missedWhileBusy = false;
        void refresh();
      },
    );
    const refreshFromStream = () => void debouncedRefresh();
    const stream = useStreamTopic(
      () => (modelId.value ? { type: "model", id: modelId.value } : null),
      refreshFromStream,
    );
    watch(visibility, (state) => {
      if (state === "visible" && stream.status.value !== "open") refreshFromStream();
    });
  }

  return {
    comments: computed(() => local.comments),
    pagination: computed(() => local.pagination),
    status,
    refresh,
    busy,
    pending,
    submitToken,
    create,
    reply,
    edit,
    like,
    unlike,
    remove,
    loadReplies,
    loadMore,
  };
}
