import type { ModelAdditionalFileEventPayloads } from '#src/modules/model-additional-file/model-additional-file.events.ts';
import type { ModelAuthorEventPayloads } from '#src/modules/model-author/model-author.events.ts';
import type { ModelCommentEventPayloads } from '#src/modules/model-comment/model-comment.events.ts';
import type { ModelDraftEventPayloads } from '#src/modules/model-draft/model-draft.events.ts';
import type { ModelLikeEventPayloads } from '#src/modules/model-like/model-like.events.ts';
import type { ModelPermissionEventPayloads } from '#src/modules/model-permission/model-permission.events.ts';
import type { ModelVersionEventPayloads } from '#src/modules/model-version/model-version.events.ts';
import type { ModelVersionTagEventPayloads } from '#src/modules/model-version-tag/model-version-tag.events.ts';
import type { ModelEventPayloads } from '#src/modules/model/model.events.ts';
import type { UserEventPayloads } from '#src/modules/user/user.events.ts';

export type EventPayloads = ModelEventPayloads &
  ModelAdditionalFileEventPayloads &
  ModelAuthorEventPayloads &
  ModelCommentEventPayloads &
  ModelDraftEventPayloads &
  ModelLikeEventPayloads &
  ModelPermissionEventPayloads &
  ModelVersionEventPayloads &
  ModelVersionTagEventPayloads &
  UserEventPayloads;

export type EventType = keyof EventPayloads;
