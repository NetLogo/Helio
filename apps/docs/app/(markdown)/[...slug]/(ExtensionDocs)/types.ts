import z from 'zod';
import { Primitive } from './entities';

export type TypeName =
  | { kind: 'WildcardType' }
  | { kind: 'NetLogoList' }
  | { kind: 'NetLogoString' }
  | { kind: 'NetLogoBoolean' }
  | { kind: 'NetLogoNumber' }
  | { kind: 'Agentset'; of: 'Patch' | 'Turtle' | 'Link' }
  | { kind: 'Agent'; of: 'Patch' | 'Turtle' }
  | { kind: 'Symbol' }
  | { kind: 'CodeBlock' }
  | { kind: 'CommandBlock' }
  | { kind: 'CommandType' }
  | { kind: 'ReporterType' }
  | { kind: 'ReporterBlock' }
  | { kind: 'ReferenceType' }
  | { kind: 'OptionalType' }
  | { kind: 'Repeatable'; of: TypeName }
  | { kind: 'CustomType'; name: string };

export type PrimitiveType =
  | { kind: 'command' }
  | { kind: 'reporter'; returns: TypeName };

export const NamedTypeSchema = z.object({
  name: z.string().optional(), // argument name
  type: z.string().optional(), // defaults to anything
});

export const PrimitiveSchema = z.object({
  name: z.string().optional(), // warn if missing -> drop primitive
  description: z.string().optional().default(''),
  type: z.enum(['command', 'reporter']).optional().default('command'),
  returns: z.string().optional().default(''),
  infix: z.boolean().optional().default(false),
  arguments: z.array(NamedTypeSchema).optional().default([]),
  alternateArguments: z
    .array(
      NamedTypeSchema.catch(() => {
        return {
          type: 'unknown',
          name: 'unknown',
        };
      })
    )
    .optional(), // if present, will combine
  tags: z.array(z.string()).optional().default([]),
});

export const RootDocumentSchema = z.object({
  extensionName: z.string().optional().default(''),
  primitives: z.array(PrimitiveSchema).optional().default([]),

  tableOfContents: z.record(z.string(), z.string()).optional(),
  additionalVariables: z.record(z.string(), z.unknown()).optional().default({}),

  filesToIncludeInManual: z.array(z.string()).optional().default([]),
});

export interface ExtensionConfig {
  extensionName: string;
  filesToIncludeInManual?: Array<string>;
  markdownTemplate?: string;
  primTemplate?: string;
  tableOfContents?: Record<string, string>;
  primitives: Array<Primitive>;
  additionalVariables?: Record<string, unknown>;
}
