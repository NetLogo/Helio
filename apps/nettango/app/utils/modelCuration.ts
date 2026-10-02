import type { GalleryModel } from "~/composables/useModels";

export type GradeBand = "elementary" | "middle-school" | "high-school";

export type ModelLesson = {
  title: string;
  url: string;
  provider: string;
};

export type ModelGroup = {
  id: string;
  title: string;
  description: string;
  lead: string;
  models: string[];
};

export type ModelSequence = {
  id: string;
  title: string;
  models: string[];
};

export type ModelMetadata = {
  subjects: string[];
  gradeBands: GradeBand[];
  gradeBandSource: string | null;
  creators: string[];
  basedOn: string | null;
  license: string | null;
  lesson: ModelLesson | null;
  related: string[];
  tips: string[];
};

export type ModelCuration = {
  groups: ModelGroup[];
  sequences: ModelSequence[];
  models: Record<string, ModelMetadata>;
};

export type ResolvedGroup = {
  id: string;
  title: string;
  description: string;
  models: GalleryModel[];
};

export type SequencePosition = {
  title: string;
  step: number;
  total: number;
  previous: string | null;
  next: string | null;
};

const MORE_MODELS_GROUP: Omit<ResolvedGroup, "models"> = {
  id: "more-models",
  title: "More models",
  description: "Other models in the gallery.",
};

export const resolveGroups = (curation: ModelCuration, models: GalleryModel[]): ResolvedGroup[] => {
  const byId = new Map(models.map((model) => [model.id, model]));
  const placed = new Set<string>();

  const groups = curation.groups
    .map(({ id, title, description, models: ids }) => ({
      id,
      title,
      description,
      models: ids.flatMap((modelId) => {
        const model = byId.get(modelId);
        if (!model || placed.has(modelId)) return [];
        placed.add(modelId);
        return [model];
      }),
    }))
    .filter((group) => group.models.length > 0);

  const unplaced = models.filter((model) => !placed.has(model.id));
  return unplaced.length > 0 ? [...groups, { ...MORE_MODELS_GROUP, models: unplaced }] : groups;
};

export const sequencePosition = (
  curation: ModelCuration,
  modelId: string,
): SequencePosition | null => {
  const sequence = curation.sequences.find((candidate) => candidate.models.includes(modelId));
  if (!sequence) return null;
  const index = sequence.models.indexOf(modelId);
  return {
    title: sequence.title,
    step: index + 1,
    total: sequence.models.length,
    previous: sequence.models[index - 1] ?? null,
    next: sequence.models[index + 1] ?? null,
  };
};

export const modelMetadata = (curation: ModelCuration, modelId: string): ModelMetadata | null =>
  curation.models[modelId] ?? null;
