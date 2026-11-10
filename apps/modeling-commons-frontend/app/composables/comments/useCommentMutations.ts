import type { MaybeRefOrGetter } from "vue";
import { getResponseData, throwUnlessOk } from "~/composables/comments/useComments";

type CreateInput = RequestBody<"POST", "/api/v1/models/{id}/comments">;
type Created = ResponseSuccessData<"POST", "/api/v1/models/{id}/comments">;
type TargetInput = { commentId: string; content?: string };

export default function useCommentMutations(modelId: MaybeRefOrGetter<string>) {
  const api = useApi();
  const getModelPath = () => ({ id: toValue(modelId) });
  const getCommentPath = (commentId: string) => ({ id: toValue(modelId), commentId });

  return {
    async create(body: CreateInput): Promise<Created> {
      const result = await api.POST("/api/v1/models/{id}/comments", {
        params: { path: getModelPath() },
        body,
      });
      return getResponseData(result, "POST comment");
    },
    async edit({ commentId, content }: Required<TargetInput>): Promise<void> {
      const { response } = await api.PATCH("/api/v1/models/{id}/comments/{commentId}", {
        params: { path: getCommentPath(commentId) },
        body: { content },
      });
      throwUnlessOk(response, `PATCH comment ${commentId}`);
    },
    async like({ commentId }: TargetInput): Promise<void> {
      const { response } = await api.POST("/api/v1/models/{id}/comments/{commentId}/like", {
        params: { path: getCommentPath(commentId) },
      });
      throwUnlessOk(response, `POST like on comment ${commentId}`);
    },
    async unlike({ commentId }: TargetInput): Promise<void> {
      const { response } = await api.DELETE("/api/v1/models/{id}/comments/{commentId}/like", {
        params: { path: getCommentPath(commentId) },
      });
      throwUnlessOk(response, `DELETE like on comment ${commentId}`);
    },
    async remove({ commentId }: TargetInput): Promise<void> {
      const { response } = await api.DELETE("/api/v1/models/{id}/comments/{commentId}", {
        params: { path: getCommentPath(commentId) },
      });
      throwUnlessOk(response, `DELETE comment ${commentId}`);
    },
  };
}
