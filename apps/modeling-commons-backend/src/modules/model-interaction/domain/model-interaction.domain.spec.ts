import { describe, it, expect } from 'vitest';
import modelInteractionDomain from '#src/modules/model-interaction/domain/model-interaction.domain.ts';
import { ModelInteractionKind } from '#src/modules/model-interaction/domain/model-interaction.types.ts';
import type { ClientContext } from '#src/shared/http/client-context.ts';
import { ID_PATTERN } from '#src/shared/utils/id.ts';

const domain = modelInteractionDomain();

function ctx(overrides: Partial<ClientContext> = {}): ClientContext {
  return {
    userId: null,
    sessionId: null,
    ipHash: null,
    userAgent: null,
    referer: null,
    cookie: null,
    ...overrides,
  };
}

describe('modelInteractionDomain', () => {
  describe('create', () => {
    it('builds an entity with an id and copies the client context', () => {
      const entity = domain.create(
        'model-1',
        ModelInteractionKind.view,
        ctx({
          userId: 'user-1',
          sessionId: 'sess-1',
          ipHash: 'iphash',
          userAgent: 'ua',
          referer: 'r',
          cookie: 'ck',
        }),
        5,
      );

      expect(entity.id).toMatch(new RegExp(ID_PATTERN));
      expect(entity.modelId).toBe('model-1');
      expect(entity.kind).toBe(ModelInteractionKind.view);
      expect(entity.versionNumber).toBe(5);
      expect(entity.userId).toBe('user-1');
      expect(entity.sessionId).toBe('sess-1');
      expect(entity.ipHash).toBe('iphash');
      expect(entity.userAgent).toBe('ua');
      expect(entity.referer).toBe('r');
      expect(entity.cookie).toBe('ck');
      expect(entity.geo).toBeNull();
      expect(entity.createdAt).toBeInstanceOf(Date);
    });

    it('accepts a null versionNumber', () => {
      const entity = domain.create('model-1', ModelInteractionKind.run, ctx(), null);
      expect(entity.versionNumber).toBeNull();
    });

    it('produces unique ids on repeated calls', () => {
      const a = domain.create('m', ModelInteractionKind.share, ctx(), null);
      const b = domain.create('m', ModelInteractionKind.share, ctx(), null);
      expect(a.id).not.toBe(b.id);
    });
  });
});
