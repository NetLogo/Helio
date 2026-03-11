import { Primitives } from "@repo/common-data";

let primitives: Primitives | undefined = undefined;
export const usePrimitive = async ({ name }: { name: string }) => {
  if (import.meta.dev) {
    if (typeof primitives === "undefined") {
      const { data } = await useAsyncData("primitives", () => queryCollection("primitives").all(), {
        deep: false,
        server: true,
        dedupe: "defer",
      });

      if (data.value) {
        primitives = Primitives.getInstance(data.value[0]?.primitives ?? []);
      }
    }

    return {
      primitive: computed(() => {
        if (!primitives) return null;
        return primitives.getPrimByName(name);
      }),
      pending: computed(() => typeof primitives === "undefined" && !primitives),
      error: computed(() => null),
    };
  }

  const { data, pending, error } = await useAsyncData(
    `primitive-${name}`,
    () => queryCollection("primitives").all(),
    {
      deep: false,
      server: true,
      dedupe: "defer",
      transform: async (allPrimitivesData) => {
        const primitives = Primitives.getInstance(allPrimitivesData[0]?.primitives ?? []);
        const rawPrimitive = { ...primitives.getPrimByName(name) };

        return rawPrimitive || null;
      },
    },
  );

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

export const useNoPrimitive = () => {
  return {
    primitive: computed(() => null),
    pending: computed(() => false),
    error: computed(() => null),
  };
};
