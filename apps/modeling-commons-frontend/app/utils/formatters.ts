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

export function formatDate(dateStr: string): string {
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
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-pink-100 text-pink-700 border-pink-200",
  ];
  return classes[tagName.charCodeAt(0) % classes.length]!;
}

export function getFileUrl(fileId: string): string {
  return `/api/v1/files/${fileId}/download`;
}
