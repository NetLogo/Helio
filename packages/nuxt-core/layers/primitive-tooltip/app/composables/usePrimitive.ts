import { Primitives } from "@repo/common-data";

type Primitive = ReturnType<typeof Primitives.prototype.getPrimByName> | null;
let primitives: Primitives | undefined = undefined;

function convertRelativeMarkdownLinksToAbsolute(markdown: string, baseUrl: string): string {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const convertedMarkdown = markdown.replace(markdownLinkRegex, (match, text, url) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      const absoluteUrl = new URL(url, baseUrl).href;
      return `[${text}](${absoluteUrl})`;
    }
    return match;
  });

  return convertedMarkdown;
}

function parsePrimitive(prim: Primitive): Primitive {
  if (!prim) return null;
  if (prim.description) {
    prim.description = convertRelativeMarkdownLinksToAbsolute(
      prim.description,
      "https://docs.netlogo.org/",
    );
  }

  return prim;
}

export const usePrimitive = async ({ name }: { name: string }) => {
  if (import.meta.dev) {
    const { data } = await useAsyncData("primitives", () => queryCollection("primitives").all(), {
      deep: false,
      server: true,
      dedupe: "defer",
    });

    if (data.value) {
      primitives = Primitives.getInstance(data.value[0]?.primitives ?? []);
    }

    const prim = parsePrimitive(primitives?.getPrimByName(name));

    return {
      primitive: computed(() => prim),
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
        const prim = parsePrimitive(primitives.getPrimByName(name));

        return prim ?? null;
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
