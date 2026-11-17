import { ID_LENGTH } from '#src/shared/utils/id.ts';
import { Type, type Static } from 'typebox';

const topicKeyPattern = `[a-z]+:[A-Za-z0-9_-]{${ID_LENGTH}}`;

export const streamTopicsQueryDtoSchema = Type.Object({
  topics: Type.String({
    pattern: `^${topicKeyPattern}(,${topicKeyPattern})*$`,
    description: 'Comma-separated topic keys the stream follows, such as model:<id>,user:<id>',
  }),
});

export type StreamTopicsQueryDto = Static<typeof streamTopicsQueryDtoSchema>;
