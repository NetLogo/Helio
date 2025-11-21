import { z } from "zod";

const PrimitiveSchema = z.object({
  /** Unique identifier for the primitive */
  id: z.string(),
  /** Key for the primitive (e.g. symbols, abs, gis:distance, etc...) */
  key: z.string().min(1),
  /** Name of the NetLogo primitive */
  name: z.string().min(1),
  /** Alternative names for the primitive, e.g., without extension prefix */
  alternativeNames: z.array(z.string()).optional(),
  /** Whether the primitive is from an extension */
  isFromExtension: z.boolean().optional(),
  /** Source of the primitive: netlogo, netlogo-3d, or extension name */
  source: z.string().min(1),
  /** URL to the primitive's documentation */
  url: z.string(),
  /** Description of the primitive (Markdown) */
  description: z.string().optional(),
  /** Syntax of the primitive */
  syntax: z.array(z.string()).optional(),
  /** Code examples for the primitive (Markdown) */
  examples: z.array(z.string()).optional(),
  /** Metadata for the primitive, usually its source before transformation */
  metadata: z.record(z.string(), z.any()).optional(),
});

type Primitive = z.infer<typeof PrimitiveSchema>;

type SomeNamedExtension =
  | "arduino"
  | "array"
  | "bitmap"
  | "csv"
  | "gis"
  | "gogo"
  | "ls"
  | "matrix"
  | "nw"
  | "palette"
  | "profiler"
  | "py"
  | "resource"
  | "rnd"
  | "sound"
  | "time"
  | "sr"
  | "table"
  | "vid"
  | "view2.5d";

type Source = "netlogo" | "netlogo-3d" | SomeNamedExtension | string; // extension name

class Primitives {
  static instance: Primitives | null = null;
  public readonly primsKeyMap: Record<string, Primitive>;
  public readonly primsNameMap: Record<string, Primitive>;

  static getInstance(prims: Array<Primitive>) {
    if (!Primitives.instance) {
      Primitives.instance = new Primitives(prims);
    }
    return Primitives.instance;
  }

  public constructor(public readonly prims: Array<Primitive>) {
    this.primsKeyMap = Object.fromEntries(prims.map((prim) => [prim.key, prim]));
    this.primsNameMap = Object.fromEntries(prims.map((prim) => [prim.name, prim]));
  }

  public getPrimByName(name: string): Primitive | undefined {
    return this.primsNameMap[name];
  }

  public getPrimByKey(key: string): Primitive | undefined {
    return this.primsNameMap[key];
  }
}

export { Primitives, PrimitiveSchema };
export type { Primitive, Source };
