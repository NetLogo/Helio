import {
  behaviorSearchProduct,
  hubnetWebProduct,
  netlogo3dProduct,
  netlogoProduct,
  netLogoWebProduct,
  nettangoProduct,
  turtleUniverseProduct,
} from './products';
import type { Product } from './types';

class Products {
  private products: Map<string, Product>;

  constructor(products: Array<Product>) {
    this.products = new Map(products.map((product) => [product.id, product]));
  }

  getProductById(id?: string | null): Product | undefined {
    if (!id) {
      return undefined;
    }
    return this.products.get(id);
  }

  getProductByName(name?: string | null): Product | undefined {
    if (!name) {
      return undefined;
    }
    for (const product of this.products.values()) {
      if (product.name === name) {
        return product;
      }
    }
    return undefined;
  }

  aggregate<T>(aggregator: (product: Product) => T): Array<T> {
    const result: Array<T> = [];
    for (const product of this.products.values()) {
      result.push(aggregator(product));
    }
    return result;
  }
}

export const products = new Products([
  netlogoProduct,
  netLogoWebProduct,
  behaviorSearchProduct,
  hubnetWebProduct,
  netlogo3dProduct,
  nettangoProduct,
  turtleUniverseProduct,
]);
export * from './products';
export type * from './types';
