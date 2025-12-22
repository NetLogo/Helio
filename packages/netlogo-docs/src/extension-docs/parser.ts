import yaml from "yaml";
import type z from "zod";

import type { Warning } from "@repo/utils/algebraic/monads/warnable";
import WarnableValue from "@repo/utils/algebraic/monads/warnable";

import { NetLogoType, Primitive, PrimSyntax } from "./entities";
import type {
  ExtensionConfig,
  NamedTypeSchema,
  PrimitiveSchema,
  PrimitiveType,
  TypeName,
} from "./types";
import { RootDocumentSchema } from "./types";

const stringToType = (s0: string | undefined): TypeName => {
  const s = (s0 ?? "").trim().toLowerCase();
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (true) {
    case s === "" || s === "anything":
      return { kind: "WildcardType" };
    case s === "list":
      return { kind: "NetLogoList" };
    case s === "string":
      return { kind: "NetLogoString" };
    case s === "boolean":
      return { kind: "NetLogoBoolean" };
    case s === "number":
      return { kind: "NetLogoNumber" };
    case s === "patchset":
      return { kind: "Agentset", of: "Patch" };
    case s === "turtleset":
      return { kind: "Agentset", of: "Turtle" };
    case s === "linkset":
      return { kind: "Agentset", of: "Link" };
    case s === "turtle":
      return { kind: "Agent", of: "Turtle" };
    case s === "patch":
      return { kind: "Agent", of: "Patch" };
    case s === "symbol":
      return { kind: "Symbol" };
    case s === "code block":
      return { kind: "CodeBlock" };
    case s === "command block":
      return { kind: "CommandBlock" };
    case s === "command":
      return { kind: "CommandType" };
    case s === "reporter":
      return { kind: "ReporterType" };
    case s === "reporter block":
      return { kind: "ReporterBlock" };
    case s === "reference":
      return { kind: "ReferenceType" };
    case s === "optional command block":
      return { kind: "OptionalType" };
    case s.startsWith("repeatable "):
      return {
        kind: "Repeatable",
        of: stringToType(s.slice("repeatable ".length)),
      };
    default:
      return { kind: "CustomType", name: s0 ?? "unknown" };
  }
};

type PrimWarnFunction = (msg: string) => (key: string, line?: number) => string;
const primWarning: PrimWarnFunction = (msg: string) => (key: string, line?: number) =>
  `Missing ${key} for primitive${typeof line === "number" ? ` on line ${line}` : ""}, ${msg}`;

type ArgWarnFunction = (msg: string) => (key: string, arg?: string, line?: number) => string;
const argWarning: ArgWarnFunction = (msg: string) => (key: string, arg?: string, line?: number) =>
  `Argument ${arg ?? ""} ${typeof line === "number" ? ` on line ${line}` : ""} has no ${key}, ${msg}`;

const warn = (message: string, line?: number): Warning => ({
  message,
  line,
});

function parseNetLogoType(input: z.infer<typeof NamedTypeSchema>): WarnableValue<NetLogoType> {
  const ln = undefined;
  const nameOpt = input.name;
  const typeStr = input.type ?? "anything";

  const w: Array<Warning> = [];
  if (!(typeof input.type === "string"))
    w.push(warn(argWarning("assuming wildcard type")("type", nameOpt, ln), ln));

  const t = stringToType(typeStr);
  const nt = new NetLogoType(t, nameOpt);

  return new WarnableValue(nt, w);
}

function foldArgs(parsed: Array<WarnableValue<NetLogoType>>): WarnableValue<Array<NetLogoType>> {
  return parsed.reduce(
    (acc, v) => acc.merge(v, (xs, x) => [...xs, x]),
    new WarnableValue<Array<NetLogoType>>([]),
  );
}

function parsePrimSyntax(p: z.infer<typeof PrimitiveSchema>): WarnableValue<PrimSyntax> {
  const infix = !!p.infix;

  const argsWV = foldArgs(p.arguments.map(parseNetLogoType));

  const altArgumentsWV: WarnableValue<Array<NetLogoType> | undefined> = p.alternateArguments
    ? foldArgs(p.alternateArguments.map(parseNetLogoType)).map((args) => args)
    : new WarnableValue(undefined);

  const primArgsWV: WarnableValue<Array<Array<NetLogoType>>> = argsWV.flatMap((args) =>
    altArgumentsWV.map((altArgs) => {
      if (args.length === 0) {
        return [[]];
      } else {
        return altArgs ? [args, altArgs] : [args];
      }
    }),
  );

  const syntax = new PrimSyntax(primArgsWV.obtainedValue, infix);
  return new WarnableValue(syntax, primArgsWV.warnings);
}

function parsePrimitive(
  extensionName: string,
  p: z.infer<typeof PrimitiveSchema>,
): WarnableValue<Primitive | null> {
  const ln = undefined;
  const warnings: Array<Warning> = [];

  if (!(typeof p.name === "string")) {
    warnings.push(warn(primWarning("excluding from results")("name", ln), ln));
    return new WarnableValue<Primitive | null>(null, warnings);
  }

  if (!p.description) {
    warnings.push(
      warn(primWarning(`adding empty description for primitive ${p.name}`)("description", ln), ln),
    );
  }

  // type & returns
  let primitiveType: PrimitiveType = { kind: "command" };
  if (p.type === "command") {
    primitiveType = { kind: "command" };
  } else {
    primitiveType = {
      kind: "reporter",
      returns: stringToType(p.returns),
    };
  }

  const syntaxWV = parsePrimSyntax(p);

  const primWV = syntaxWV.map(
    (syntax) =>
      new Primitive(
        p.name ?? "Untitled",
        extensionName,
        primitiveType,
        p.description,
        syntax,
        p.tags.filter((t): t is string => typeof t === "string"),
      ),
  );

  return new WarnableValue(primWV.obtainedValue, [...warnings, ...primWV.warnings]);
}

type ParsingResult = {
  primitives: Array<Primitive>;
  warnings: Array<Warning>;
};

function parsePrimitivesFromConfig(root: unknown): ParsingResult {
  const v = RootDocumentSchema.safeParse(root);
  if (!v.success) {
    // surface zod issues as “warnings”, keep going with empty
    const zWarnings = v.error.issues.map((i) =>
      warn(`Config error at ${i.path.join(".") || "<root>"}: ${i.message}`),
    );
    return { primitives: [], warnings: zWarnings };
  }

  const data = v.data;
  const extensionName = data.extensionName || "unknown";
  const results = data.primitives.map((p) => parsePrimitive(extensionName, p));

  const primitives: Array<Primitive> = [];
  const warnings: Array<Warning> = [];
  for (const r of results) {
    warnings.push(...r.warnings);
    if (r.obtainedValue) primitives.push(r.obtainedValue);
  }
  return { primitives, warnings };
}

// ---------- Documentation config (optional section) ----------
function parseExtensionConfig(root: unknown): WarnableValue<ExtensionConfig | null> {
  const v = RootDocumentSchema.safeParse(root);
  if (!v.success) {
    const ws = v.error.issues.map((i) =>
      warn(`Config error at ${i.path.join(".") || "<root>"}: ${i.message}`),
    );
    return new WarnableValue<ExtensionConfig | null>(null, ws);
  }
  const d = v.data;

  const toc: Record<string, string> = d.tableOfContents ?? {};
  return new WarnableValue<ExtensionConfig>({
    extensionName: d.extensionName,
    icon: d.icon,
    tableOfContents: toc,
    additionalVariables: d.additionalVariables,
    filesToIncludeInManual: d.filesToIncludeInManual,
    primitives: [],
  });
}

function parseConfigText(text: string): unknown {
  return yaml.parse(text);
}

function parseAllFromText(yamlRawString: string): {
  primitives: Array<Primitive>;
  documentation: ExtensionConfig | null;
  warnings: WarnableValue<null>;
} {
  const root = parseConfigText(yamlRawString);
  const primRes = parsePrimitivesFromConfig(root);
  const docRes = parseExtensionConfig(root);

  const docValue = docRes.obtainedValue;
  if (docValue) {
    docValue.primitives = primRes.primitives;
  }

  return {
    primitives: primRes.primitives,
    documentation: docRes.obtainedValue,
    warnings: new WarnableValue(null, [...primRes.warnings, ...docRes.warnings]),
  };
}

export {
  argWarning,
  parseAllFromText,
  parseConfigText,
  parseExtensionConfig,
  parsePrimitivesFromConfig,
  primWarning,
  warn,
};
export type { ArgWarnFunction, ParsingResult, PrimWarnFunction };
