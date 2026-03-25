import { randomUUID } from 'node:crypto';
import type { CreateTagProps, TagEntity } from '#src/modules/tag/domain/tag.types.ts';
import { InvalidTagNameError } from '#src/modules/tag/domain/tag.errors.ts';

const TAG_NAME_PATTERN = /^[\w\- ]+$/;
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

    createTag(props: CreateTagProps): TagEntity {
      const name = this.validateName(props.name);
      return {
        id: randomUUID(),
        name,
        createdAt: new Date(),
      };
    },
  };
}
