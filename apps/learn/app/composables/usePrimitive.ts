import { Primitives } from '@repo/common-data';

export const usePrimitive = async ({ name }: { name: string }) => {
  const { data, pending, error } = await useAsyncData(`primitive-${name}`, () => queryCollection('primitives').all(), {
    deep: false,
    server: true,
    dedupe: 'defer',
    transform: async (allPrimitivesData) => {
      const primitives = Primitives.getInstance(allPrimitivesData[0]?.primitives ?? []);
      const rawPrimitive = { ...primitives.getPrimByName(name) };

      return rawPrimitive || null;
    },
  });

  const primitive = computed(() => {
    if (!data.value) return null;
    return data.value;
  });

  return {
    primitive,
    pending,
    error,
  };
};
