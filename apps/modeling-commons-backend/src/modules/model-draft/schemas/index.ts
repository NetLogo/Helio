import Schema from 'typebox/schema';
import {
  DRAFT_SCHEMA_VERSION_V1,
  draftDataV1Schema,
  strictDraftDataV1Schema,
  type DraftDataV1,
  type StrictDraftDataV1,
} from '#src/modules/model-draft/schemas/v1.ts';
import {
  ModelDraftInvalidPayloadError,
  UnknownDraftSchemaVersionError,
} from '#src/modules/model-draft/domain/model-draft.errors.ts';

export const LATEST_DRAFT_SCHEMA_VERSION = DRAFT_SCHEMA_VERSION_V1;

export type DraftData = DraftDataV1;
export type StrictDraftData = StrictDraftDataV1;

const latestCompiled = Schema.Compile(draftDataV1Schema);
const latestStrictCompiled = Schema.Compile(strictDraftDataV1Schema);

export function upcast(data: unknown, fromVersion: number): DraftData {
  switch (fromVersion) {
    case DRAFT_SCHEMA_VERSION_V1: {
      try {
        return latestCompiled.Parse(data);
      } catch (err) {
        throw new ModelDraftInvalidPayloadError((err as Error).message);
      }
    }
    default:
      throw new UnknownDraftSchemaVersionError(fromVersion);
  }
}

export function assertPublishable(data: DraftData): StrictDraftData {
  try {
    return latestStrictCompiled.Parse(data);
  } catch (err) {
    throw new ModelDraftInvalidPayloadError((err as Error).message);
  }
}

export function emptyDraftData(): DraftData {
  return {};
}

export * from '#src/modules/model-draft/schemas/v1.ts';
