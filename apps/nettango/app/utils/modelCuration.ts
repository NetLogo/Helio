import type { GalleryModel } from "~/composables/useModels";

export type GradeBand = "elementary" | "middle-school" | "high-school";

export type ModelLesson = {
  title: string;
  url: string;
  provider: string;
};

export type ModelTutorial = {
  title: string;
  url: string;
  author: string;
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
  tutorial?: ModelTutorial;
  title?: string;
  authors?: string[];
  description?: string;
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

// The groups are the keep list: a model in no group is hidden from every listing but keeps its page.
export const resolveGroups = (curation: ModelCuration, models: GalleryModel[]): ResolvedGroup[] => {
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const placed = new Set<string>();

  return curation.groups
    .map(({ id, title, description, models: ids }) => ({
      id,
      title,
      description,
      models: ids.flatMap((modelId) => {
        const model = modelsById.get(modelId);
        if (!model || placed.has(modelId)) return [];
        placed.add(modelId);
        return [model];
      }),
    }))
    .filter((group) => group.models.length > 0);
};

export const applyCuratedOverrides = (models: GalleryModel[], curation: ModelCuration): GalleryModel[] =>
  models.map((model) => {
    const { title, authors } = curation.models[model.id] ?? {};
    return { ...model, ...(title && { title }), ...(authors && { authors }) };
  });

export const getSequencePosition = (
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

export const getModelMetadata = (curation: ModelCuration, modelId: string): ModelMetadata | null =>
  curation.models[modelId] ?? null;

export type ModelNavLink = { id: string; title: string };

export type ModelNavigation = {
  groups: { id: string; title: string; models: (ModelNavLink & { current: boolean })[] }[];
  topic: { id: string; title: string } | null;
  sequence: {
    title: string;
    step: number;
    total: number;
    previous: ModelNavLink | null;
    next: ModelNavLink | null;
  } | null;
};

export const getModelNavigation = (
  curation: ModelCuration,
  models: GalleryModel[],
  currentId: string,
): ModelNavigation => {
  const groups = resolveGroups(curation, models).map(({ id, title, models: members }) => ({
    id,
    title,
    models: members.map((model) => ({ id: model.id, title: model.title, current: model.id === currentId })),
  }));
  const topic = groups.find((group) => group.models.some((model) => model.current));
  const position = getSequencePosition(curation, currentId);
  const link = (id: string | null): ModelNavLink | null => {
    const model = id ? models.find((candidate) => candidate.id === id) : undefined;
    return model ? { id: model.id, title: model.title } : null;
  };

  return {
    groups,
    topic: topic ? { id: topic.id, title: topic.title } : null,
    sequence: position && {
      title: position.title,
      step: position.step,
      total: position.total,
      previous: link(position.previous),
      next: link(position.next),
    },
  };
};
