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
  lastPage: number;
  count: number;
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

export const COMMENT_TREE_DEFAULTS = {
  maximumNested: 3,
  maximumShownRepliesPerLevel: 5,
} as const;

export type CommentViewSettings = {
  maximumNested?: number;
  maximumShownRepliesPerLevel?: number;
  isNested?: boolean;
  parentHasSeeMoreReplies?: boolean;
  isLastSibling?: boolean;
  readOnly?: boolean;
  highlightedCommentId?: string;
  // A submission (create/reply/edit/delete) is in flight: inputs and actions
  // render disabled. `submitToken` ticks once per successful submission so an
  // open input knows to close/clear itself.
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
