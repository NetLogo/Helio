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
  const modelsById = new Map(models.map((model) => [model.id, model]));
  return [...new Set(ids)].flatMap((id) => {
    const model = modelsById.get(id);
    return model && id !== exclude ? [model] : [];
  });
};

export const getGradeBandLabels = (bands: GradeBand[]): string[] =>
  bands.map((band) => GRADE_BAND_LABELS[band]);

export const formatTutorialCredit = (tutorial: ModelTutorial): string => `Tutorial by ${tutorial.author}`;

export const getModelDescription = (
  model: Pick<GalleryModel, "description">,
  metadata: Pick<ModelMetadata, "description"> | null,
): string => metadata?.description ?? model.description;

const getFirstValue = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

export const isSidebarHiddenQuery = (value: unknown): boolean => getFirstValue(value) === "hidden";

export const isStudentModeQuery = (value: unknown): boolean => getFirstValue(value) === "student";

export const STUDENT_MODE_ATTRIBUTE = "data-nt-student";

export const TEACHER_ONLY_ATTRIBUTE = "data-teacher-only";

// Prerendered pages ignore the query, so this marks the page before first paint and the CSS below
// keeps teaching content off screen until hydration removes it for good.
export const STUDENT_MODE_BOOT_SCRIPT =
  `try{if(new URLSearchParams(location.search).getAll("mode")[0]==="student")` +
  `document.documentElement.setAttribute("${STUDENT_MODE_ATTRIBUTE}","")}catch(e){}`;

export const STUDENT_MODE_CSS = `html[${STUDENT_MODE_ATTRIBUTE}] [${TEACHER_ONLY_ATTRIBUTE}]{display:none!important}`;
