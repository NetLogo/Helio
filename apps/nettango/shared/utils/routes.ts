export const TUTORIAL_PATH = "/tutorials/introduction-to-the-nettango-builder";

export const getModelPath = (id: string, studentMode = false): string =>
  `/models/${encodeURIComponent(id)}${studentMode ? "?mode=student" : ""}`;

export const getGroupPath = (id: string): string => `/models-library#group-${id}`;
