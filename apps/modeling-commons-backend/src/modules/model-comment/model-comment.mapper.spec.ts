import { describe, it, expect } from 'vitest';
import modelCommentMapper from '#src/modules/model-comment/model-comment.mapper.ts';
import type { ModelCommentEntity } from '#src/modules/model-comment/domain/model-comment.types.ts';

const mapper = modelCommentMapper();

function makeEntity(overrides: Partial<ModelCommentEntity> = {}): ModelCommentEntity {
  return {
    id: 'comment-1',
    legacyId: null,
    parentId: null,
    userId: 'user-1',
    modelId: 'model-1',
    versionNumber: null,
    content: 'hello world',
    likesCount: 3,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    editedAt: null,
    deletedAt: null,
    user: { id: 'user-1', name: 'Alice', image: 'https://cdn/alice.png' },
    likedByMe: false,
    ...overrides,
  };
}

describe('modelCommentMapper', () => {
  describe('toResponse', () => {
    it('maps a well-formed comment with an anonymous viewer', () => {
      const result = mapper.toResponse(makeEntity());

      expect(result).toEqual({
        id: 'comment-1',
        modelId: 'model-1',
        parentId: undefined,
        versionNumber: undefined,
        legacyId: undefined,
        author: { id: 'user-1', name: 'Alice', image: 'https://cdn/alice.png' },
        content: 'hello world',
        createdAt: '2026-01-01T00:00:00.000Z',
        edited: undefined,
        deleted: undefined,
        likes: 3,
        likedByMe: undefined,
        permissions: undefined,
      });
    });

    it('projects a tombstone: placeholder author, [deleted] content, deleted:true, no permissions', () => {
      const entity = makeEntity({
        content: null,
        deletedAt: new Date('2026-01-02T00:00:00.000Z'),
        user: null,
      });

      const result = mapper.toResponse(entity, { viewerId: 'user-1', viewerRole: 'admin' });

      expect(result.content).toBe('[deleted]');
      expect(result.author).toEqual({ id: '', name: '[deleted]', image: '' });
      expect(result.deleted).toBe(true);
      expect(result.permissions).toBeUndefined();
      expect(result.likes).toBe(3);
      expect(result.likedByMe).toBe(false);
    });

    it('projects a tombstone even if the user relation is somehow still populated', () => {
      const entity = makeEntity({ content: null, deletedAt: new Date() });

      const result = mapper.toResponse(entity);

      expect(result.author).toEqual({ id: '', name: '[deleted]', image: '' });
      expect(result.content).toBe('[deleted]');
    });

    it('falls back to a placeholder author when the user was hard-deleted (userId SetNull)', () => {
      const entity = makeEntity({ user: null });

      const result = mapper.toResponse(entity);

      expect(result.author).toEqual({ id: '', name: '[deleted]', image: '' });
    });

    it('substitutes [deleted]/"" for a null name/image on a live user', () => {
      const entity = makeEntity({ user: { id: 'user-1', name: null, image: null } });

      const result = mapper.toResponse(entity);

      expect(result.author).toEqual({ id: 'user-1', name: '[deleted]', image: '' });
    });

    it('sets edited:true only when editedAt is set', () => {
      const edited = mapper.toResponse(makeEntity({ editedAt: new Date('2026-01-03T00:00:00.000Z') }));
      expect(edited.edited).toBe(true);

      const notEdited = mapper.toResponse(makeEntity({ editedAt: null }));
      expect(notEdited.edited).toBeUndefined();
    });

    it('does not derive edited from updatedAt (a likesCount bump alone must not flip it)', () => {
      const entity = makeEntity({
        editedAt: null,
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        likesCount: 42,
      });

      const result = mapper.toResponse(entity);

      expect(result.edited).toBeUndefined();
    });

    it('never sets edited:true for a deleted comment, even if editedAt was set before deletion', () => {
      const entity = makeEntity({
        content: null,
        deletedAt: new Date(),
        editedAt: new Date('2026-01-02T00:00:00.000Z'),
      });

      const result = mapper.toResponse(entity);

      expect(result.edited).toBeUndefined();
      expect(result.deleted).toBe(true);
    });

    it('omits permissions entirely for an anonymous viewer (viewerId undefined)', () => {
      const result = mapper.toResponse(makeEntity(), {});
      expect(result.permissions).toBeUndefined();
    });

    it('reports canEdit/canDelete=true for the author', () => {
      const result = mapper.toResponse(makeEntity({ userId: 'user-1' }), { viewerId: 'user-1' });
      expect(result.permissions).toEqual({ canEdit: true, canDelete: true });
    });

    it('reports canEdit=false/canDelete=true for an admin viewer who is not the author', () => {
      const result = mapper.toResponse(makeEntity({ userId: 'user-1' }), {
        viewerId: 'admin-1',
        viewerRole: 'admin',
      });
      expect(result.permissions).toEqual({ canEdit: false, canDelete: true });
    });

    it('reports canEdit=false/canDelete=false for a viewer who is neither author nor admin', () => {
      const result = mapper.toResponse(makeEntity({ userId: 'user-1' }), {
        viewerId: 'user-2',
        viewerRole: 'user',
      });
      expect(result.permissions).toEqual({ canEdit: false, canDelete: false });
    });

    it('omits permissions for a deleted comment even with a viewerId present', () => {
      const entity = makeEntity({ content: null, deletedAt: new Date() });
      const result = mapper.toResponse(entity, { viewerId: 'user-1' });
      expect(result.permissions).toBeUndefined();
    });

    it('includes likedByMe only when a viewerId is present', () => {
      const entity = makeEntity({ likedByMe: true });

      expect(mapper.toResponse(entity).likedByMe).toBeUndefined();
      expect(mapper.toResponse(entity, { viewerId: 'user-1' }).likedByMe).toBe(true);
    });

    it('carries parentId, versionNumber, and legacyId through when present', () => {
      const entity = makeEntity({ parentId: 'parent-1', versionNumber: 2, legacyId: 99 });
      const result = mapper.toResponse(entity);

      expect(result.parentId).toBe('parent-1');
      expect(result.versionNumber).toBe(2);
      expect(result.legacyId).toBe(99);
    });

    it('never attaches a replies field — that is the query layer’s job', () => {
      const result = mapper.toResponse(makeEntity());
      expect(result.replies).toBeUndefined();
    });
  });
});
