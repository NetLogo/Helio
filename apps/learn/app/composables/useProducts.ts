import { products } from '~/assets/products';

export function useProducts() {
  const _products = ref(products);
  return { products: _products };
}
