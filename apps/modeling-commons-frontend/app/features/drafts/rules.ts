import { sizeToBytes } from "~/utils/converters";

export const draftRules = {
  netlogoFile: { maxSize: 10 * 1024 * 1024, acceptedFileTypes: [".nlogox"] },
  modelFile: { maxSize: sizeToBytes(10, "MB") },
  additionalFile: { maxSize: sizeToBytes(10, "MB") },
  previewImage: { maxSize: sizeToBytes(15, "MB") },
} as const;
