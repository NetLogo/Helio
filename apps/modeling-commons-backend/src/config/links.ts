import env from '#src/config/env.ts';

// Web app URLs, not this API's routes. Anything we hand to a user - emails,
// notification deep links - is built here so a frontend route change is one edit.
const base = env.product.website.replace(/\/+$/, '');

function absolute(path: string, query: Record<string, string> = {}): string {
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url.toString();
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

const links = {
  model: (modelId: string) => absolute(`/models/${segment(modelId)}`),

  modelComment: (modelId: string, commentId: string, highlightedCommentId?: string) =>
    absolute(
      `/models/${segment(modelId)}/comments/${segment(commentId)}`,
      highlightedCommentId ? { highlightedCommentId } : {},
    ),

  user: (userId: string) => absolute(`/users/${segment(userId)}`),

  notificationPreferences: () => absolute('/settings/notifications'),

  support: () => `mailto:${env.product.supportEmail}`,
};

export default links;
