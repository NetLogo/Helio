export const AuthorRole = {
  owner: 'owner',
  contributor: 'contributor',
} as const;
export type AuthorRole = (typeof AuthorRole)[keyof typeof AuthorRole];

export type ModelAuthorEntity = {
  modelId: string;
  userId: string;
  role: AuthorRole;
  createdAt: Date;
};

export type AddContributorProps = {
  modelId: string;
  userId: string;
};

export type TransferOwnershipProps = {
  modelId: string;
  newOwnerId: string;
};
