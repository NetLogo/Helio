import models from "~/data/models.json";

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

export const useModels = (): GalleryModel[] => models as GalleryModel[];

const BUILDER_URL = "https://netlogoweb.org/nettango-builder?netTangoModel=";

export const useModelEditorUrl = (model: GalleryModel): string => {
  if (model.editor) return model.editor;
  const project = model.project.startsWith("/")
    ? useRequestURL().origin + model.project
    : model.project;
  return BUILDER_URL + project;
};
