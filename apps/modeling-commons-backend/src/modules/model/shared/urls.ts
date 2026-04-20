import env from '#src/config/env.ts';

export function getModelPreviewImageUrl(modelId: string, versionNumber: number) {
  return `${env.server.endpoint}/api/v1/models/${modelId}/versions/${versionNumber}/preview-image`;
}
