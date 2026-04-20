export const NLWHost = import.meta.dev ? "http://localhost:9000" : "https://www.netlogoweb.org";

export function getNetlogoWebEmbedUrl(modelUrl: string, title: string = "NetLogo Model") {
  const url = new URL(`${NLWHost}/web`);
  url.searchParams.set("url", modelUrl);
  url.searchParams.set("title", title);
  return url.toString();
}

export function getNetlogoWebIframeCode(modelUrl: string, title: string = "NetLogo Model") {
  const embedUrl = getNetlogoWebEmbedUrl(modelUrl, title);
  return `<iframe src="${embedUrl}" title="${title}" style="width: 100%; min-height: 600px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="no-referrer" allowfullscreen></iframe>`;
}

export function getNetlogoWebMarkdownPreviewCode(
  modelUrl: string,
  title: string = "NetLogo Model",
  previewImageUrl?: string | null,
) {
  const embedUrl = getNetlogoWebEmbedUrl(modelUrl, title);
  const iframeCode = getNetlogoWebIframeCode(modelUrl, title);

  const iframePart = [
    "<!-- or via NetLogo Web Iframe Code (uncomment to embed) -->",
    `<!-- ${iframeCode} -->`,
  ].join("\n");

  if (previewImageUrl) {
    return `[![${title}](${previewImageUrl})](${embedUrl})\n\n\n${iframePart}\n`;
  } else {
    return `[${title}](${embedUrl})\n\n\n${iframePart}\n`;
  }
}
