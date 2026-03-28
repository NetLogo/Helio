import { ConflictException, NotFoundException } from '#src/shared/exceptions/index.ts';

export class PermissionAlreadyExistsError extends ConflictException {
  constructor(modelId: string, granteeUserId: string) {
    super(
      `Permission already exists for user ${granteeUserId} on model ${modelId}`,
    );
  }
}

export class PermissionNotFoundError extends NotFoundException {
  constructor(modelId: string, granteeUserId: string) {
    super(
      `Permission not found for user ${granteeUserId} on model ${modelId}`,
    );
  }
}
