import { camelCaseToKebabCase } from "@repo/utils/std/string";
import { toSlug } from "../helpers";
import type { PrimitiveType, TypeName } from "./types";

class NetLogoType {
  public readonly kind: "UnnamedType" | "DescribedType";
  public readonly explicitName: string | undefined;
  public constructor(
    public readonly type: TypeName,
    name: string | undefined,
  ) {
    this.kind = typeof name === "string" ? "DescribedType" : "UnnamedType";
    this.explicitName = name;
  }

  protected nameFromType(): string {
    let typeName: string = this.type.kind;

    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (true) {
      case this.type.kind === "CustomType":
        typeName = this.type.name;
        break;
      case this.type.kind === "WildcardType":
        typeName = "anything";
        break;
      default:
        typeName = this.type.kind;
        break;
    }
    return camelCaseToKebabCase(
      typeName.endsWith("Type")
        ? typeName.slice(0, typeName.length - "Type".length)
        : typeName.startsWith("NetLogo")
          ? "Netlogo" + typeName.slice("NetLogo".length)
          : typeName,
    );
  }

  public get name(): string {
    if (this.kind === "DescribedType")
      return camelCaseToKebabCase(this.explicitName as unknown as string);
    return this.nameFromType();
  }
}

class Primitive {
  public readonly fullName: string;
  public readonly description: string;

  public constructor(
    public readonly name: string,
    public readonly extensionName: string,
    public readonly primitiveType: PrimitiveType,
    description: string,
    public readonly syntax: PrimSyntax,
    public readonly tags: Array<string>,
  ) {
    if (this.extensionName && this.extensionName.length > 0) {
      this.fullName = `${this.extensionName}:${this.name}`;
    } else {
      this.fullName = this.name;
    }
    this.description = description;
  }
}

class PrimitiveArgument {
  public constructor(
    public readonly arg: NetLogoType,
    public readonly index = 0,
    public readonly isOptional = false,
  ) {}
  public getTypeName(): string {
    return this.arg.name;
  }
  public getArgName(): string {
    return this.arg.name;
  }
}

class PrefixPrimExample {
  public readonly args: Array<{ type: string; name: string }>;
  public constructor(
    public readonly primitive: Primitive,
    args: Array<NetLogoType> = [],
    public readonly isOptional: boolean = false,
  ) {
    this.args = args
      .map((arg, index) => new PrimitiveArgument(arg, index, isOptional))
      .map((arg) => ({
        type: arg.getTypeName(),
        name: arg.getArgName(),
      }));
  }
}

class InfixPrimExample {
  public constructor(
    public readonly primitive: Primitive,
    public readonly leftArg: NetLogoType,
    public readonly rightArgs: Array<NetLogoType> = [],
  ) {}
}

class PrimSyntax {
  public constructor(
    public readonly args: Array<Array<NetLogoType>>,
    public readonly isInfix: boolean = false,
  ) {}

  public get areAltArgsOptional(): boolean {
    return this.args.length > 1 && this.args[0]?.length != this.args[1]?.length;
  }
}

class MustachePrimitiveWrapper {
  public readonly name: string;
  public readonly description: string;
  public readonly isInfix: boolean;
  public readonly examples: Array<PrefixPrimExample | InfixPrimExample>;

  public constructor(public readonly primitive: Primitive) {
    this.name = primitive.fullName;
    this.description = primitive.description;
    this.isInfix = primitive.syntax.isInfix;
    this.examples = this.wrapExamples(primitive.syntax.args);
  }

  public get id(): string {
    const replaceTable = {
      "/": "-slash-",
      "*": "-asterisk-",
      "+": "-plus-",
      "=": "-equals-",
      "<": "-less-than-",
      ">": "-greater-than-",
      "!": "-exclamation-",
    };
    const slugArtifact = Object.entries(replaceTable).reduce(
      (acc, [key, value]) => acc.replace(new RegExp(`\\${key}`, "g"), value),
      this.primitive.name,
    );
    return toSlug(slugArtifact);
  }

  private wrapExamples(
    args: Array<Array<NetLogoType>>,
  ): Array<PrefixPrimExample | InfixPrimExample> {
    return args.map((argGroup) => {
      if (this.isInfix) {
        const leftArg = argGroup.at(0);
        if (!leftArg) throw new Error("Infix primitive must have at least one argument");
        return new InfixPrimExample(this.primitive, leftArg, argGroup.slice(1));
      } else {
        return new PrefixPrimExample(this.primitive, argGroup);
      }
    });
  }
}

class TOCPrimitiveWrapper extends MustachePrimitiveWrapper {
  public readonly last: boolean;
  public constructor(primitive: Primitive, last = false) {
    super(primitive);
    this.last = last;
  }

  public static fromPrims(prims: Array<MustachePrimitiveWrapper>): Array<TOCPrimitiveWrapper> {
    return prims.map(
      (prim, index) => new TOCPrimitiveWrapper(prim.primitive, index === prims.length - 1),
    );
  }
}

class TableOfContentsSection {
  public constructor(
    public readonly fullCategoryName: string,
    public readonly shortCategoryName: string,
    public readonly prims: Array<TOCPrimitiveWrapper>,
  ) {}

  public static fromCategoryName(
    fullCategoryName: string,
    shortCategoryName: string,
    unfilteredPrims: Array<MustachePrimitiveWrapper>,
  ): TableOfContentsSection | null {
    const prims = unfilteredPrims.filter((prim) => prim.primitive.tags.includes(shortCategoryName));
    if (prims.length === 0) return null;
    return new TableOfContentsSection(
      fullCategoryName,
      shortCategoryName,
      TOCPrimitiveWrapper.fromPrims(prims),
    );
  }
}

class TableOfContents {
  public constructor(public readonly sections: Array<TableOfContentsSection>) {}
  public static fromPrimitives(
    unfilteredPrims: Array<MustachePrimitiveWrapper>,
    sectionNames: Record<string, string>,
  ): TableOfContents {
    const sections = Object.entries(sectionNames)
      .map(([shortCategoryName, fullCategoryName]) => {
        return TableOfContentsSection.fromCategoryName(
          fullCategoryName,
          shortCategoryName,
          unfilteredPrims,
        );
      })
      .filter((section): section is TableOfContentsSection => section !== null);
    if (sections.length === 0) {
      return new TableOfContents([
        new TableOfContentsSection(
          "All Primitives",
          "all",
          TOCPrimitiveWrapper.fromPrims(unfilteredPrims),
        ),
      ]);
    }
    return new TableOfContents(sections);
  }
}

export {
  InfixPrimExample,
  MustachePrimitiveWrapper,
  NetLogoType,
  PrefixPrimExample,
  Primitive,
  PrimitiveArgument,
  PrimSyntax,
  TableOfContents,
  TableOfContentsSection,
};
