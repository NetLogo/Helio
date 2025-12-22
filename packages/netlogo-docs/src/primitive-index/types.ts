import z from "zod";

export const PrimitiveCatalogSchema = z.object({
  /**
   * The name of the primitive catalog dictionary.
   * This is displayed in the sidebar and at the end of the page.
   */
  dictionaryDisplayName: z.string().default("NetLogo Dictionary"),
  dictionaryHomeDirectory: z.string().default("../dictionary.html"),
  indexFileURI: z.string(),
  currentItemId: z.string(),
  currentItemLabel: z.string().default(""),
  primRoot: z.string(),
});

export type PrimitiveCatalog = {
  dictionaryDisplayName: string;
  dictionaryHomeDirectory: string;
  indexFileURI: string;
  currentItemId: string;
  currentItemLabel: string;
  primRoot: string;
  surround?: object;
};
