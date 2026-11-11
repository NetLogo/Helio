import type { MaybeRefOrGetter } from "vue";

type TargetInput = { commentId: string; content?: string };

export default function useCommentMutations(modelId: MaybeRefOrGetter<string>) {
  return {
    create: (body: CreateCommentInput): Promise<CreatedComment> =>
      createComment(toValue(modelId), body),
    edit: ({ commentId, content }: Required<TargetInput>): Promise<void> =>
      editComment(toValue(modelId), commentId, content),
    like: ({ commentId }: TargetInput): Promise<void> => likeComment(toValue(modelId), commentId),
    unlike: ({ commentId }: TargetInput): Promise<void> =>
      unlikeComment(toValue(modelId), commentId),
    remove: ({ commentId }: TargetInput): Promise<void> =>
      deleteComment(toValue(modelId), commentId),
  };
}
