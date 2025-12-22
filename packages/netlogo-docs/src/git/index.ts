// For every file in autogen

import child_process from "child_process";
import fs from "fs";
import path from "path";
import type z from "zod";
import { GitMetadataSchema, type GitMetadata } from "./public-schema";
class GitLog {
  public readonly date: string;
  public readonly author: string;
  public constructor(line: string) {
    const parts = line.split(" ");
    if (parts.length < 2)
      throw Error(
        `Incorrect Git Log Format. Expected {{ YYYY-MM-DD }} {{ author_name }}. Received ${line}.`,
      );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.date = parts[0]!;
    this.author = parts.slice(1).join(" ");
  }
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function generateGitMetadata(
  scanRoot: string,
  projectRoot = process.cwd(),
  outputFile = "git-metadata.json",
): Record<string, GitMetadata> {
  const files = fs.readdirSync(scanRoot, { withFileTypes: true, recursive: true });
  const gitMetadataList = Object.fromEntries(
    files
      .filter((file) => file.isFile())
      .filter((file) => !file.name.startsWith("."))
      .map((file) => {
        const filePath = path.relative(process.cwd(), path.join(file.parentPath, file.name));
        const command = `git log --pretty=format:"%ad %an" --date=short --follow -- ${filePath}`;
        try {
          const gitLog = child_process.execSync(command).toString().trim().split("\n");

          let unparsed: Partial<z.infer<typeof GitMetadataSchema>> = {};

          const firstGitEntry = gitLog.at(-1);
          unparsed.createdDate =
            firstGitEntry !== undefined
              ? new GitLog(firstGitEntry).date
              : dateFormatter.format(new Date());

          unparsed.authors = Array.from(
            new Set(
              gitLog.map((entry) => {
                const parts = entry.split(" ");
                return parts.slice(1).join(" ");
              }),
            ),
          );

          const lastGitEntry = gitLog[0];
          if (lastGitEntry === undefined) {
            return [filePath, GitMetadataSchema.parse(unparsed)];
          }

          unparsed.lastModifiedAuthor = new GitLog(lastGitEntry).author;
          unparsed.lastModifiedDate = new GitLog(lastGitEntry).date;

          return [filePath, GitMetadataSchema.parse(unparsed)];
        } catch (error) {
          console.error(`Error generating git metadata for file: ${filePath}`, error);
          return [
            filePath,
            GitMetadataSchema.parse({
              createdDate: dateFormatter.format(new Date()),
              authors: [],
            }),
          ];
        }
      }),
  );

  if (outputFile) {
    fs.writeFileSync(
      path.join(projectRoot, outputFile),
      JSON.stringify(gitMetadataList, null, 2),
      "utf-8",
    );
  }

  return gitMetadataList;
}

export function appendGitMetadata(
  existingMetadata: Record<string, unknown>,
  gitMetadata: Record<string, GitMetadata>,
): Record<string, unknown> {
  const source = existingMetadata["source"] as string;
  if (!source) {
    return existingMetadata;
  }
  const gitData = gitMetadata[source];
  if (!gitData) {
    return existingMetadata;
  }
  return {
    ...existingMetadata,
    ...gitData,
  };
}
