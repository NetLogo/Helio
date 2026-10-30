import { getModelPath } from "./routes.ts";

export type LlmsLink = {
  title: string;
  url: string;
  description: string;
};

export type LlmsSection = {
  title: string;
  description?: string;
  links: LlmsLink[];
};

export type LlmsDocument = {
  title: string;
  summary: string;
  sections: LlmsSection[];
};

const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim();

const formatLink = ({ title, url, description }: LlmsLink): string => {
  const note = oneLine(description);
  return note ? `- [${oneLine(title)}](${url}): ${note}` : `- [${oneLine(title)}](${url})`;
};

const formatSection = ({ title, description, links }: LlmsSection): string =>
  [`## ${oneLine(title)}`, description ? oneLine(description) : null, links.map(formatLink).join("\n")]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");

export const buildLlmsText = ({ title, summary, sections }: LlmsDocument): string =>
  [`# ${oneLine(title)}`, `> ${oneLine(summary)}`, ...sections.filter((section) => section.links.length > 0).map(formatSection)].join(
    "\n\n",
  ) + "\n";

export const toAbsoluteUrl = (siteUrl: string, path: string): string => new URL(path, siteUrl).href;

export type LlmsModel = { id: string; title: string; description: string };
export type LlmsCuration = {
  groups: { title: string; description: string; models: string[] }[];
  models: Record<string, { title?: string; description?: string }>;
};

/*
 * Mirrors resolveGroups in app/utils/modelCuration.ts (curated order, each model
 * once, models in no group left out). The server project cannot type-check the
 * app utils because they import Nuxt composables; fold both when those move to shared/.
 */
export const buildModelSections = (curation: LlmsCuration, models: LlmsModel[], url: (path: string) => string): LlmsSection[] => {
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const placed = new Set<string>();
  const link = (model: LlmsModel): LlmsLink => ({
    title: curation.models[model.id]?.title ?? model.title,
    url: url(getModelPath(model.id)),
    description: curation.models[model.id]?.description ?? model.description,
  });

  return curation.groups.map(({ title, description, models: ids }) => ({
    title: `Models: ${title}`,
    description,
    links: ids.flatMap((id) => {
      const model = modelsById.get(id);
      if (!model || placed.has(id)) return [];
      placed.add(id);
      return [link(model)];
    }),
  }));
};
