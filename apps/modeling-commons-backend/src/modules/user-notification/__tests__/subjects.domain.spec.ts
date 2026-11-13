import { describe, it, expect } from 'vitest';
import links from '#src/config/links.ts';
import {
  collectActorIds,
  collectModelIds,
  getTargetModelId,
  toActorPreview,
} from '#src/modules/user-notification/core/subjects.domain.ts';

function makeRefs(
  id: string,
  actorId: string | null,
  targetId: string | null,
  targetType: 'model' | null = targetId ? 'model' : null,
) {
  return { id, actorId, targetType, targetId };
}

describe('userNotificationSubjects', () => {
  it('reads the model id only from a model target', () => {
    expect(getTargetModelId(makeRefs('n-1', null, 'model-1'))).toBe('model-1');
    expect(getTargetModelId(makeRefs('n-2', null, null))).toBeNull();
  });

  it('collects unique actor and model ids, skipping missing ones', () => {
    const notifications = [
      makeRefs('n-1', 'user-1', 'model-1'),
      makeRefs('n-2', 'user-1', 'model-1'),
      makeRefs('n-3', 'user-2', null),
      makeRefs('n-4', null, 'model-2'),
    ];

    expect(collectActorIds(notifications)).toEqual(['user-1', 'user-2']);
    expect(collectModelIds(notifications)).toEqual(['model-1', 'model-2']);
  });

  it('subjects an avatar as a link to the user', () => {
    expect(
      toActorPreview({ id: 'user-1', name: 'Alice', image: 'https://img.test/a.png' }),
    ).toEqual({
      name: 'Alice',
      thumbnailUrl: 'https://img.test/a.png',
      url: links.user('user-1'),
    });
  });
});
