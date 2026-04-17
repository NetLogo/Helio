import type { ModelAuthor } from '#prisma/index';
import { AuthorRole } from '#prisma/index';

export { AuthorRole };
export type ModelAuthorEntity = ModelAuthor;

export type AddContributorProps = {
  modelId: string;
  userId: string;
};

export type TransferOwnershipProps = {
  modelId: string;
  newOwnerId: string;
};
