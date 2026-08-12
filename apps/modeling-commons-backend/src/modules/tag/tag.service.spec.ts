import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeTagService from '#src/modules/tag/tag.service.ts';
import tagDomain from '#src/modules/tag/domain/tag.domain.ts';
import { TagNotFoundError } from '#src/modules/tag/domain/tag.errors.ts';
import { mockTagRepository } from '#src/modules/tag/database/tag.repository.mock.ts';

describe('tagService', () => {
  const tagRepository = mockTagRepository();
  const domain = tagDomain();

  const service = makeTagService({
    tagRepository,
    tagDomain: domain,
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByPrefix', () => {
    it('delegates to repository with pagination', async () => {
      const paginated = { count: 1, limit: 20, page: 0, data: [{ id: 't1', name: 'ecology' }] };
      tagRepository.findByPrefix.mockResolvedValue(paginated);

      const result = await service.findByPrefix('eco', {});

      expect(result).toBe(paginated);
      expect(tagRepository.findByPrefix).toHaveBeenCalledWith(
        'eco',
        expect.objectContaining({ limit: 20 }),
      );
    });
  });

  describe('findByIdOrName', () => {
    const nanoId = 'V1StGXR8Z5jdHi6BmyT8C';

    it('finds by id', async () => {
      const tag = { id: nanoId, name: 'test' };
      tagRepository.findOneById.mockResolvedValue(tag);

      const result = await service.findByIdOrName(nanoId);

      expect(result).toBe(tag);
      expect(tagRepository.findOneById).toHaveBeenCalledWith(nanoId);
      expect(tagRepository.findByNameInsensitive).not.toHaveBeenCalled();
    });

    it('finds by name when id lookup misses', async () => {
      const tag = { id: 't1', name: 'ecology' };
      tagRepository.findOneById.mockResolvedValue(undefined);
      tagRepository.findByNameInsensitive.mockResolvedValue(tag);

      const result = await service.findByIdOrName('ecology');

      expect(result).toBe(tag);
      expect(tagRepository.findOneById).toHaveBeenCalledWith('ecology');
      expect(tagRepository.findByNameInsensitive).toHaveBeenCalledWith('ecology');
    });

    it('finds a tag whose name is NanoID-shaped, by name', async () => {
      const tag = { id: 't2', name: nanoId };
      tagRepository.findOneById.mockResolvedValue(undefined);
      tagRepository.findByNameInsensitive.mockResolvedValue(tag);

      const result = await service.findByIdOrName(nanoId);

      expect(result).toBe(tag);
      expect(tagRepository.findOneById).toHaveBeenCalledWith(nanoId);
      expect(tagRepository.findByNameInsensitive).toHaveBeenCalledWith(nanoId);
    });

    it('throws TagNotFoundError when neither lookup matches, querying at most twice', async () => {
      tagRepository.findOneById.mockResolvedValue(undefined);
      tagRepository.findByNameInsensitive.mockResolvedValue(undefined);

      await expect(service.findByIdOrName('missing')).rejects.toThrow(TagNotFoundError);
      expect(tagRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(tagRepository.findByNameInsensitive).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertByName', () => {
    it('returns existing tag if found', async () => {
      const existing = { id: 't1', name: 'ecology' };
      tagRepository.findByNameInsensitive.mockResolvedValue(existing);

      const result = await service.upsertByName('ecology');

      expect(result).toBe(existing);
      expect(tagRepository.upsertByName).not.toHaveBeenCalled();
    });

    it('creates new tag if not found', async () => {
      tagRepository.findByNameInsensitive.mockResolvedValue(undefined);
      tagRepository.upsertByName.mockResolvedValue({ id: 't2', name: 'new-tag' });

      const result = await service.upsertByName('new-tag');

      expect(result.name).toBe('new-tag');
      expect(tagRepository.upsertByName).toHaveBeenCalledOnce();
    });
  });
});
