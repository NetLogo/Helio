import { useSiteConfig } from "#site-config/app/composables";
import curation from "~/data/model-curation.json";
import models from "~/data/models.json";
import { applyCuratedOverrides, type ModelCuration } from "~/utils/modelCuration";

export type GalleryModel = {
  id: string;
  title: string;
  description: string;
  authors: string[];
  tags: string[];
  thumbnail?: string;
  animatedThumbnail?: string;
  player: string;
  project: string;
  editor?: string;
  frameHeight?: number;
  source?: "library";
};

const curatedModels = applyCuratedOverrides(models as GalleryModel[], curation as ModelCuration);

export const useModels = (): GalleryModel[] => curatedModels;

const BUILDER_URL = "https://netlogoweb.org/nettango-builder?netTangoModel=";

export const useModelEditorUrl = (model: GalleryModel): string => {
  if (model.editor) return model.editor;
  return BUILDER_URL + new URL(model.project, useSiteConfig().url).href;
};
