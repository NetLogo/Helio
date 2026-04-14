import { describe, it, expect } from 'vitest';
import modelVersionDomain from '#src/modules/model-version/domain/model-version.domain.ts';
import { VersionFinalizedError } from '#src/modules/model-version/domain/model-version.errors.ts';
import type { ModelVersionEntity } from '#src/modules/model-version/domain/model-version.types.ts';

const domain = modelVersionDomain();

describe('modelVersionDomain', () => {
  describe('createVersion', () => {
    it('creates version entity', () => {
      const version = domain.createVersion({
        modelId: 'm1',
        versionNumber: 1,
        title: 'V1',
        nlogoxFileId: 'f1',
      });

      expect(version.versionNumber).toBe(1);
      expect(version.finalizedAt).toBeNull();
    });
  });

  describe('assertNotFinalized', () => {
    it('passes for non-finalized version', () => {
      const version: ModelVersionEntity = {
        modelId: 'm1',
        versionNumber: 1,
        title: 'T',
        description: null,
        previewImage: null,
        nlogoxFileId: 'f1',
        netlogoVersion: null,
        infoTab: null,
        createdAt: new Date(),
        finalizedAt: null,
      };
      expect(() => domain.assertNotFinalized(version)).not.toThrow();
    });

    it('throws VersionFinalizedError for finalized version', () => {
      const version: ModelVersionEntity = {
        modelId: 'm1',
        versionNumber: 1,
        title: 'T',
        description: null,
        previewImage: null,
        nlogoxFileId: 'f1',
        netlogoVersion: null,
        infoTab: null,
        createdAt: new Date(),
        finalizedAt: new Date(),
      };
      expect(() => domain.assertNotFinalized(version)).toThrow(VersionFinalizedError);
    });
  });
});
