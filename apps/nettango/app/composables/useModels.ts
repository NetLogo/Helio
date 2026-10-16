import { useSiteConfig } from "#site-config/app/composables";
import models from "~/data/models.json";

export type GalleryModel = {
  id: string;
  title: string;
  description: string;
  authors: string[];
  tags: string[];
  thumbnail?: string;
  animatedThumbnail?: string;
  stepThumbnail?: string;
  player: string;
  project: string;
  editor?: string;
  frameHeight?: number;
  source?: "library";
};

export const useModels = (): GalleryModel[] => models as GalleryModel[];

const BUILDER_URL = "https://netlogoweb.org/nettango-builder?netTangoModel=";

export const useModelEditorUrl = (model: GalleryModel): string => {
  if (model.editor) return model.editor;
  return BUILDER_URL + new URL(model.project, useSiteConfig().url).href;
};
