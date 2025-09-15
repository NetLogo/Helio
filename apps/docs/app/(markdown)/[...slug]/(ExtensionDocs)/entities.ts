import { camelCaseToKebabCase } from '@repo/utils/std/string';
import { PrimitiveType, TypeName } from './types';

export class NetLogoType {
  public readonly kind: 'UnnamedType' | 'DescribedType';
  public readonly explicitName: string | undefined;
  constructor(
    public readonly type: TypeName,
    name: string | undefined
  ) {
    this.kind = name ? 'DescribedType' : 'UnnamedType';
    this.explicitName = name;
  }

  nameFromType() {
    let typeName;
    switch (true) {
      case this.type.kind === 'CustomType':
        typeName = this.type.name;
        break;
      case this.type.kind === 'WildcardType':
        typeName = 'anything';
        break;
      default:
        typeName = this.type.kind;
        break;
    }
    return camelCaseToKebabCase(
      typeName.endsWith('Type')
        ? typeName.slice(0, typeName.length - 'Type'.length).toLowerCase()
        : typeName.toLowerCase()
    );
  }

  get name(): string {
    if (this.kind === 'DescribedType')
      return camelCaseToKebabCase(this.explicitName!);
    return this.nameFromType();
  }
}

class Primitive {
  public readonly fullName: string;
  public readonly description: string;

  constructor(
    public readonly name: string,
    public readonly extensionName: string,
    public readonly primitiveType: PrimitiveType,
    description: string,
    public readonly syntax: PrimSyntax,
    public readonly tags: Array<string>
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
  constructor(
    public readonly arg: NetLogoType,
    public readonly index = 0,
    public readonly isOptional = false
  ) {}
  getTypeName(): string {
    return this.arg.name;
  }
  getArgName(index: number): string {
    return this.arg.name ?? `arg${index + 1}`;
  }
}

class PrefixPrimExample {
  public readonly args: { type: string; name: string }[];
  constructor(
    public readonly primitive: Primitive,
    args: Array<NetLogoType> = [],
    public readonly isOptional: boolean = false
  ) {
    this.args = args
      .map((arg, index) => new PrimitiveArgument(arg, index, isOptional))
      .map((arg) => ({
        type: arg.getTypeName(),
        name: arg.getArgName(arg.index),
      }));
  }
}

class InfixPrimExample {
  constructor(
    public readonly primitive: Primitive,
    public readonly leftArg: NetLogoType,
    public readonly rightArgs: Array<NetLogoType> = []
  ) {}
}

class PrimSyntax {
  constructor(
    public readonly args: NetLogoType[][],
    public readonly isInfix: boolean = false
  ) {}

  get areAltArgsOptional(): boolean {
    return this.args.length > 1 && this.args[0]!.length != this.args[1]!.length;
  }
}

class MustachePrimitiveWrapper {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly isInfix: boolean;
  public readonly examples: Array<PrefixPrimExample | InfixPrimExample>;

  constructor(public readonly primitive: Primitive) {
    this.name = primitive.fullName;
    this.id = primitive.name.toLowerCase().replace(/\s+/g, '_');
    this.description = primitive.description;
    this.isInfix = primitive.syntax.isInfix;
    this.examples = this.wrapExamples(primitive.syntax.args);
  }

  private wrapExamples(
    args: NetLogoType[][]
  ): Array<PrefixPrimExample | InfixPrimExample> {
    return args.map((argGroup) => {
      if (this.isInfix) {
        return new InfixPrimExample(
          this.primitive,
          argGroup.at(0)!,
          argGroup.slice(1)
        );
      } else {
        return new PrefixPrimExample(this.primitive, argGroup);
      }
    });
  }
}

class TableOfContentsSection {
  constructor(
    public readonly fullCategoryName: string,
    public readonly shortCategoryName: string,
    public readonly prims: MustachePrimitiveWrapper[]
  ) {}

  static fromCategoryName(
    fullCategoryName: string,
    shortCategoryName: string,
    unfilteredPrims: MustachePrimitiveWrapper[]
  ): TableOfContentsSection | null {
    const prims = unfilteredPrims.filter((prim) =>
      prim.primitive.tags.includes(shortCategoryName)
    );
    if (prims.length === 0) return null;
    return new TableOfContentsSection(
      fullCategoryName,
      shortCategoryName,
      prims
    );
  }
}

class TableOfContents {
  constructor(public readonly sections: TableOfContentsSection[]) {}
  static fromPrimitives(
    unfilteredPrims: MustachePrimitiveWrapper[],
    sectionNames: Record<string, string>
  ): TableOfContents {
    const sections = Object.entries(sectionNames)
      .map(([shortCategoryName, fullCategoryName]) => {
        return TableOfContentsSection.fromCategoryName(
          fullCategoryName,
          shortCategoryName,
          unfilteredPrims
        );
      })
      .filter((section): section is TableOfContentsSection => section !== null);
    if (sections.length === 0) {
      return new TableOfContents([
        new TableOfContentsSection('All Primitives', 'all', unfilteredPrims),
      ]);
    }
    return new TableOfContents(sections);
  }
}

export {
  InfixPrimExample,
  MustachePrimitiveWrapper,
  PrefixPrimExample,
  Primitive,
  PrimitiveArgument,
  PrimSyntax,
  TableOfContents,
  TableOfContentsSection,
};
