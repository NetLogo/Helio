import curation from "~/data/model-curation.json";
import type { ModelCuration } from "~/utils/modelCuration";

export const useModelCuration = (): ModelCuration => curation as ModelCuration;

export const useModelGroups = () => resolveGroups(useModelCuration(), useModels());
