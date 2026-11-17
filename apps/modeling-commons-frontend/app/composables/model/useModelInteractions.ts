export default function useModelInteractions() {
  return {
    like: likeModel,
    unlike: unlikeModel,
    recordView: (modelId: string, versionNumber?: number) =>
      recordModelInteraction(modelId, "views", versionNumber),
    recordRun: (modelId: string, versionNumber?: number) =>
      recordModelInteraction(modelId, "runs", versionNumber),
    recordDownload: (modelId: string, versionNumber?: number) =>
      recordModelInteraction(modelId, "downloads", versionNumber),
    recordShare: (modelId: string, versionNumber?: number) =>
      recordModelInteraction(modelId, "shares", versionNumber),
  };
}
