type Primitive = {
  id: string; // unique identifier (often, key-name)
  key: string; // key like symbols, abs, gis:distance, etc...
  name: string; // name of the NetLogo primitive
  alternativeNames?: string[]; // alternative names (gis:distance, distance, gis-distance)
  isFromExtension?: boolean;
  source: Source; // netlogo, netlogo-3d, or extension name
  url: string;
  description?: string; // markdown description
  syntax?: string[];
  examples?: string[]; // code examples in markdown
  metadata?: Record<string, unknown>;
};

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

export type { Primitive, Source };
