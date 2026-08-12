import { InvalidTagNameError } from '#src/modules/tag/domain/tag.errors.ts';
import type { CreateTagProps, TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import { newId } from '#src/shared/utils/id.ts';

const TAG_NAME_PATTERN = /^([\w\-]+:)?[\w\- ]+$/;
const TAG_NAME_MAX_LENGTH = 100;

export default function tagDomain() {
  return {
    validateName(name: string): string {
      const trimmed = name.trim();
      if (
        trimmed.length === 0 ||
        trimmed.length > TAG_NAME_MAX_LENGTH ||
        !TAG_NAME_PATTERN.test(trimmed)
      ) {
        throw new InvalidTagNameError(name);
      }
      return trimmed;
    },

    getPersistenceName(name: string): string {
      return this.validateName(name).toLowerCase();
    },

    hasProtocol(name: string): boolean {
      return /^[\w\-]+:/.test(name);
    },

    dropProtocol(name: string): string {
      return name.replace(/^[\w\-]+:/, '');
    },

    getDisplayName(name: string, displayName?: string): string {
      return displayName && this.hasProtocol(displayName)
        ? this.dropProtocol(displayName)
        : this.dropProtocol(this.validateName(name));
    },

    createTag(props: CreateTagProps): TagEntity {
      const name = this.validateName(props.name);
      return {
        id: newId(),
        name: name.toLowerCase(),
        createdAt: new Date(),
        displayName: this.getDisplayName(name, props.displayName),
        legacyId: null,
      };
    },
  };
}
