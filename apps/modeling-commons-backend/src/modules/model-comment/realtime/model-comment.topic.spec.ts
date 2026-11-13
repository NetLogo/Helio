import { describe, expect, it } from 'vitest';
import { modelCommentTopic } from '#src/modules/model-comment/realtime/model-comment.topic.ts';
import { NotFoundException } from '#src/shared/exceptions/index.ts';

type FakeModel = {
  visibility: string;
  authors: Array<{ role: string }>;
  permissions: Array<{ permissionLevel: string }>;
};

function makeDeps(model: FakeModel | null): Dependencies {
  const db = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        systemRole: 'user',
        banned: false,
        deletedAt: null,
      }),
    },
    model: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        model && { id: where.id, deletedAt: null, ...model },
    },
  };
  return { db } as unknown as Dependencies;
}

const privateModel = { visibility: 'private', authors: [], permissions: [] };

describe('modelCommentTopic.canSubscribe', () => {
  it('accepts any viewer on a public model', async () => {
    const deps = makeDeps({ ...privateModel, visibility: 'public' });
    await expect(modelCommentTopic.canSubscribe(deps, 'u1', 'm1')).resolves.toBe(true);
  });

  it('refuses a viewer who cannot read a private model', async () => {
    await expect(modelCommentTopic.canSubscribe(makeDeps(privateModel), 'u1', 'm1')).resolves.toBe(
      false,
    );
  });

  it('accepts an author and a viewer granted read on a private model', async () => {
    const authored = makeDeps({ ...privateModel, authors: [{ role: 'contributor' }] });
    const granted = makeDeps({ ...privateModel, permissions: [{ permissionLevel: 'read' }] });

    await expect(modelCommentTopic.canSubscribe(authored, 'u1', 'm1')).resolves.toBe(true);
    await expect(modelCommentTopic.canSubscribe(granted, 'u1', 'm1')).resolves.toBe(true);
  });

  it('rejects with not found when the model does not exist', async () => {
    await expect(modelCommentTopic.canSubscribe(makeDeps(null), 'u1', 'm1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
