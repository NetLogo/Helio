import type { LegacyPosting } from './legacy.ts';

export type CommentInsert = {
  id: string;
  legacyId: number;
  modelId: string;
  userId: string | null;
  parentId: null;
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CommentContext = {
  userIdByLegacyId: ReadonlyMap<number, string>;
  modelIdByLegacyId: ReadonlyMap<number, string>;
  newId: () => string;
  now: () => Date;
};

export type ParentLink = { id: string; parentId: string };

/**
 * The Rails app stored bodies HTML-escaped, including the non-standard `&rt;` for
 * `>`, with CRLF line endings. The new frontend renders plaintext.
 */
export function decodeLegacyBody(body: string | null): string | null {
  if (body === null) return null;
  return (
    body
      .replace(/&lt;/g, '<')
      .replace(/&rt;/g, '>')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Last, so a decoded `&amp;lt;` stays `&lt;` instead of becoming `<`.
      .replace(/&amp;/g, '&')
      .replace(/\r\n?/g, '\n')
  );
}

/**
 * A posting whose node never reached the target (spam-excluded or dropped) yields
 * null. Soft-deleted postings come in as tombstones: content nulled, deletedAt kept,
 * so their replies still have a parent. parentId is left null for linkParents.
 */
export function mapPosting(p: LegacyPosting, ctx: CommentContext): CommentInsert | null {
  const modelId = p.node_id === null ? undefined : ctx.modelIdByLegacyId.get(p.node_id);
  if (!modelId) return null;

  const createdAt = p.created_at ?? ctx.now();
  return {
    id: ctx.newId(),
    legacyId: p.id,
    modelId,
    userId: p.person_id === null ? null : (ctx.userIdByLegacyId.get(p.person_id) ?? null),
    parentId: null,
    content: p.deleted_at === null ? decodeLegacyBody(p.body) : null,
    createdAt,
    updatedAt: p.updated_at ?? createdAt,
    deletedAt: p.deleted_at,
  };
}

/** Replies whose own row or parent row was not imported stay top-level. */
export function linkParents(
  replies: ReadonlyArray<Pick<LegacyPosting, 'id' | 'parent_id'>>,
  commentIdByLegacyId: ReadonlyMap<number, string>,
): { links: ParentLink[]; skippedOrphanParent: number } {
  const links: ParentLink[] = [];
  let skippedOrphanParent = 0;
  for (const r of replies) {
    const id = commentIdByLegacyId.get(r.id);
    const parentId = r.parent_id === null ? undefined : commentIdByLegacyId.get(r.parent_id);
    if (!id || !parentId) {
      skippedOrphanParent++;
      continue;
    }
    links.push({ id, parentId });
  }
  return { links, skippedOrphanParent };
}
