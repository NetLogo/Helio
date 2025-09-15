import z from 'zod';

export const PrimitiveCatalogPropsSchema = z.object({
  dictionaryDisplayName: z.string().default('NetLogo Dictionary'),
  dictionaryHomeDirectory: z.string().default('../dictionary.html'),
  indexFileURI: z.string(),
  currentItemId: z.string(),
  currentItemLabel: z.string().default(''),
});

export type PrimitiveCatalogProps = z.infer<
  typeof PrimitiveCatalogPropsSchema
> & {
  children?: React.ReactNode;
};
