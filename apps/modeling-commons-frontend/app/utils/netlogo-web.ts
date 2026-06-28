export const NLWHost = import.meta.dev ? "http://localhost:9000" : "https://www.netlogoweb.org";

export function getNetlogoWebEmbedUrl(modelUrl: string, title: string = "NetLogo Model") {
  const url = new URL(`${NLWHost}/web`);
  url.searchParams.set("url", modelUrl);
  url.searchParams.set("title", title);
  return url.toString();
}

export type ModelEmbedTarget = {
  modelId: string;
  slug?: string | null;
  appUrl: string;
};

export function getModelEmbedUrl({ modelId, slug, appUrl }: ModelEmbedTarget) {
  const path = slug ? `/models/${slug}/${modelId}/embed` : `/models/${modelId}/embed`;
  return new URL(path, appUrl).toString();
}

export function getModelEmbedIframeCode(target: ModelEmbedTarget, title: string = "NetLogo Model") {
  const embedUrl = getModelEmbedUrl(target);
  return `<iframe src="${embedUrl}" title="${title}" style="width: 100%; min-height: 600px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="no-referrer" allowfullscreen></iframe>`;
}

export function getModelEmbedMarkdownCode(
  target: ModelEmbedTarget,
  title: string = "NetLogo Model",
  previewImageUrl?: string | null,
) {
  const embedUrl = getModelEmbedUrl(target);

  if (previewImageUrl) {
    return `[![${title}](${previewImageUrl})](${embedUrl})\n`;
  } else {
    return `[${title}](${embedUrl})\n`;
  }
}

export async function readInfoTabFromNlogox(nlogoxContent: string) {
  const doc = new DOMParser().parseFromString(nlogoxContent, "text/xml");
  const infoTab = doc.querySelector("info");
  if (!infoTab) {
    return null;
  }
  return infoTab.textContent ?? "";
}
