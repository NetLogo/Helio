import { ObjectFunctor } from "@repo/utils/std/objects";
import slugify from "slugify";
export function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? "s" : ""} ago`;
  if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`;
  if (diffWeek > 0) return `${diffWeek} week${diffWeek > 1 ? "s" : ""} ago`;
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  return "just now";
}

export function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getVisibilityIcon(visibility: string): string {
  switch (visibility) {
    case "public":
      return "i-lucide-globe";
    case "private":
      return "i-lucide-lock";
    case "unlisted":
      return "i-lucide-eye-off";
    default:
      return "i-lucide-help-circle";
  }
}

export function getTagColorClass(tagName: string): string {
  const classes = [
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-pink-100 text-pink-700",
  ];
  return classes[tagName.charCodeAt(0) % classes.length]!;
}

export function withApiBase(uri: string): string {
  const {
    public: { apiBase },
  } = useRuntimeConfig();
  return `${apiBase}/${uri}`;
}

export function getFileURI(fileId: string): string {
  return `api/v1/files/${fileId}/download`;
}

export function getPreviewImageURI(modelId: string, versionNumber: number): string {
  return `api/v1/models/${modelId}/versions/${versionNumber}/preview-image`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${singular}`;
  return `${numberFormatter.format(count)} ${plural || singular + "s"}`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function sentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function createSlugPath(prefixPath: string, id: string, name: string): string {
  const slug = slugify(name, { lower: true, strict: true });
  const truncatedSlug = slug.length > 50 ? slug.substring(0, 50) : slug;
  return `/${prefixPath}/${truncatedSlug}/${id}`;
}

export function parseSlugPath(
  path: string,
  prefixPath: string,
): { id: string; slug: string } | null {
  const noPrefixPath = path.startsWith(prefixPath) ? path.substring(prefixPath.length) : path;
  if (!noPrefixPath.startsWith("/")) return null;
  const parts = noPrefixPath.split("/");
  if (parts.length < 3) return null;
  const id = parts[parts.length - 1]!;
  const slug = parts.slice(2, parts.length - 1).join("/");
  return { id, slug };
}

export const createModelPath = (modelId: string, modelTitle: string): string =>
  createSlugPath("models", modelId, modelTitle);

export const createTagPath = (name: string): string => `/tags/${encodeURIComponent(name)}`;
export const parseModelPath = (path: string): { modelId: string; modelSlug: string } | null =>
  new ObjectFunctor(parseSlugPath(path, "models") ?? {})
    .mapKeys((key) => {
      switch (key) {
        case "id":
          return "modelId";
        case "slug":
          return "modelSlug";
        default:
          return key;
      }
    })
    .get() as { modelId: string; modelSlug: string } | null;

export function appendWindowProtocol(url: string): string {
  const hasScheme =
    url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:");
  const currentProtocol = import.meta.dev ? "http:" : "https:";
  return hasScheme ? url : `${currentProtocol}//${url}`;
}

export function formatCountdown(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${pluralize(min, "minute")} ${pluralize(sec, "second")}`;
}

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const getModelVisibilityDisplayInfo = (
  visibility: string,
): { label: string; icon: string } => {
  switch (visibility) {
    case "public":
      return { label: "public", icon: "i-lucide-globe" };
    case "private":
      return { label: "private", icon: "i-lucide-lock" };
    case "unlisted":
      return { label: "unlisted", icon: "i-lucide-link-2" };
    default:
      return { label: capitalize(visibility), icon: "i-lucide-lock-open" };
  }
};

export const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "short",
  localeMatcher: "best fit",
  maximumFractionDigits: 1,
});
