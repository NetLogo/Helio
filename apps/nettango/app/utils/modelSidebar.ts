import type { GalleryModel } from "~/composables/useModels";
import type { GradeBand, ModelMetadata, ModelTutorial } from "~/utils/modelCuration";

const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  elementary: "Elementary school",
  "middle-school": "Middle school",
  "high-school": "High school",
};

export const resolveModels = (
  ids: string[],
  models: GalleryModel[],
  exclude?: string,
): GalleryModel[] => {
  const byId = new Map(models.map((model) => [model.id, model]));
  return [...new Set(ids)].flatMap((id) => {
    const model = byId.get(id);
    return model && id !== exclude ? [model] : [];
  });
};

export const previewSource = (model: GalleryModel, reducedMotion: boolean): string | undefined =>
  reducedMotion
    ? model.thumbnail
    : (model.stepThumbnail ?? model.animatedThumbnail ?? model.thumbnail);

export const gradeBandLabels = (bands: GradeBand[]): string[] =>
  bands.map((band) => GRADE_BAND_LABELS[band]);

export const tutorialCredit = (tutorial: ModelTutorial): string => `Tutorial by ${tutorial.author}`;

export const modelDescription = (
  model: Pick<GalleryModel, "description">,
  metadata: Pick<ModelMetadata, "description"> | null,
): string => metadata?.description ?? model.description;

export const sidebarHiddenFromQuery = (value: unknown): boolean =>
  (Array.isArray(value) ? value[0] : value) === "hidden";
