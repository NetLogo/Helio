import { formatBytes } from "~/utils/formatters";

const z = await import("zod");

export const makeFileSchema = ({
  maxFileSize,
  acceptedFileTypes,
  deniedFileTypes,
}: {
  maxFileSize: number;
  acceptedFileTypes?: string[];
  deniedFileTypes?: string[];
}) =>
  z
    .instanceof(File, { message: "Please upload a valid file." })
    .refine((file) => file.size <= maxFileSize, {
      message: `The image is too large. Please choose an image smaller than ${formatBytes(maxFileSize)}.`,
    })
    .refine(
      (file) =>
        !acceptedFileTypes ||
        acceptedFileTypes.includes(`.${file.name.split(".").pop()?.toLowerCase()}`),
      {
        message: "Unsupported file type. Please upload a file of one of the supported types.",
      },
    )
    .refine(
      (file) =>
        !deniedFileTypes ||
        !deniedFileTypes.includes(`.${file.name.split(".").pop()?.toLowerCase()}`),
      {
        message: "Unsupported file type. Please upload a file of one of the supported types.",
      },
    );
