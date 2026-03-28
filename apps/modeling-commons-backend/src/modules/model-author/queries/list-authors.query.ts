import type { ModelAuthorEntity } from '#src/modules/model-author/domain/model-author.types.ts';

export default function makeListAuthorsQuery({
  modelAuthorRepository,
}: Dependencies) {
  return {
    async execute(modelId: string): Promise<ModelAuthorEntity[]> {
      return modelAuthorRepository.findAllByModel(modelId);
    },
  };
}
