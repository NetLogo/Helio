export const modelPermissionEventTypes = {
  granted: 'model_permission.granted',
  revoked: 'model_permission.revoked',
} as const;

export type ModelPermissionEventPayloads = {
  [modelPermissionEventTypes.granted]: { granteeUserId: string; permissionLevel: string };
  [modelPermissionEventTypes.revoked]: { granteeUserId: string };
};
