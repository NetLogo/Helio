export type CommentAuthor = {
  url?: string;
  name: string;
  image: string;
};

export type CommentMetadataBarProps = {
  author: CommentAuthor;
  createdAt: string;
  threadLink?: string;
  edited?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  hiddenReplyCount?: number;
};

export type CommentPagination = {
  lastPage: number | null;
  count: number;
  limit?: number;
};

export type CommentPermissions = {
  canEdit?: boolean;
  canDelete?: boolean;
};

export type Comment = {
  id: string;
  modelId?: string;
  parentId?: string;
  author: CommentAuthor;
  /* Plaintext string */
  content: string;
  createdAt: string;
  edited?: boolean;
  deleted?: boolean;
  likes: number;
  likedByMe?: boolean;
  replies?: Array<Comment>;
  replyPagination?: CommentPagination;
  permissions?: CommentPermissions;
};

// How deep the tree renders before it offers a "continue this thread" link.
// Purely a display bound: page sizes are the server's to decide.
export const COMMENT_VIEW_DEFAULTS = {
  maximumNested: 3,
} as const;

export type CommentViewSettings = {
  maximumNested?: number;
  isNested?: boolean;
  parentHasSeeMoreReplies?: boolean;
  isLastSibling?: boolean;
  readOnly?: boolean;
  highlightedCommentId?: string;
  pending?: boolean;
  submitToken?: number;
};

export type CommentViewProps = {
  comment: Comment;
  parentAuthorName?: string;
} & CommentViewSettings;

export type CommentsPanelProps = {
  comments: Array<Comment>;
  pagination: CommentPagination;
} & CommentViewSettings;
