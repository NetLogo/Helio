import { queryCollection } from "@nuxt/content/nitro";
import { getSiteConfig } from "#site-config/server/composables";
import { absoluteUrl, buildLlmsText, modelSections, type LlmsCuration } from "#shared/utils/llms";
import curation from "~~/app/data/model-curation.json";
import models from "~~/app/data/models.json";

const BUILDER_URL = "https://netlogoweb.org/nettango-builder";

type Tutorial = { path: string; title: string; description?: string };

export default defineEventHandler(async (event) => {
  const site = getSiteConfig(event);
  const url = (path: string) => absoluteUrl(site.url, path);
  const tutorials: Tutorial[] = await queryCollection(event, "content")
    .where("path", "LIKE", "/tutorials/%")
    .select("path", "title", "description")
    .all();

  setHeader(event, "content-type", "text/plain; charset=utf-8");
  return buildLlmsText({
    title: site.name,
    summary:
      "NetTango is a block-based programming interface for NetLogo agent-based models. Students assemble blocks that set the rules of a simulation and run it in the browser; teachers build block sets for new models with the NetTango Builder.",
    sections: [
      {
        title: "Site",
        links: [
          { title: "Home", url: url("/"), description: "Overview of NetTango for teachers, with a running model and the topics covered." },
          { title: "Models Library", url: url("/models-library"), description: "Every ready-to-run model, grouped by classroom topic." },
        ],
      },
      ...modelSections(curation as LlmsCuration, models, url),
      {
        title: "Tutorials",
        links: tutorials.map((tutorial) => ({
          title: tutorial.title,
          url: url(tutorial.path),
          description: tutorial.description ?? "",
        })),
      },
      {
        title: "Builder",
        links: [
          {
            title: "NetTango Builder",
            url: BUILDER_URL,
            description: "The web editor for designing block sets and attaching them to a NetLogo model; every model page links to it with its project file loaded.",
          },
        ],
      },
    ],
  });
});
