import type { MaybeRefOrGetter } from "vue";
import { commentsApiBase } from "~/composables/comments/useComments";

type CreateInput = { content: string; parentId?: string; versionNumber?: number };
type TargetInput = { commentId: string; content?: string };

export default function useCommentMutations(modelId: MaybeRefOrGetter<string>) {
  const base = commentsApiBase();
  const commentsPath = () => `${base}/api/v1/models/${toValue(modelId)}/comments`;

  async function send(url: string, method: string, body?: Record<string, unknown>): Promise<Response> {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`${method} ${url} failed with ${response.status}`);
    return response;
  }

  return {
    async create({ content, parentId, versionNumber }: CreateInput): Promise<{ id: string }> {
      const response = await send(commentsPath(), "POST", { content, parentId, versionNumber });
      return (await response.json()) as { id: string };
    },
    async edit({ commentId, content }: Required<TargetInput>): Promise<void> {
      await send(`${commentsPath()}/${commentId}`, "PATCH", { content });
    },
    async like({ commentId }: TargetInput): Promise<void> {
      await send(`${commentsPath()}/${commentId}/like`, "POST");
    },
    async unlike({ commentId }: TargetInput): Promise<void> {
      await send(`${commentsPath()}/${commentId}/like`, "DELETE");
    },
    async remove({ commentId }: TargetInput): Promise<void> {
      await send(`${commentsPath()}/${commentId}`, "DELETE");
    },
  };
}
