import { Primitives } from "@repo/common-data";
import { escapeHTML } from "@repo/utils/std/string";

type ParsedMarkdown = Awaited<ReturnType<typeof parseMarkdown>>;
type Primitive = ReturnType<typeof Primitives.prototype.getPrimByName> | null | undefined;
type ParsedPrimitive =
  | (Omit<NonNullable<Primitive>, "description" | "examples"> & {
      description: ParsedMarkdown | null;
      examples: ParsedMarkdown | null;
    })
  | undefined
  | null;
let primitives: Primitives | undefined = undefined;

const usePrimitive = async ({ name }: { name: string }) => {
  if (import.meta.dev) {
    return usePrimitiveDev({ name });
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
        const prim = await parsePrimitive(primitives.getPrimByName(name));

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

const usePrimitiveDev = async ({ name }: { name: string }) => {
  const { data } = await useAsyncData("primitives", () => queryCollection("primitives").all(), {
    deep: false,
    server: true,
    dedupe: "defer",
  });

  if (data.value) {
    primitives = Primitives.getInstance(data.value[0]?.primitives ?? []);
  }

  const prim = await parsePrimitive(primitives?.getPrimByName(name));

  return {
    primitive: computed(() => prim),
    pending: computed(() => typeof primitives === "undefined" && !primitives),
    error: computed(() => null),
  };
};

const useNoPrimitive = () => {
  return {
    primitive: computed(() => null),
    pending: computed(() => false),
    error: computed(() => null),
  };
};

// Utilities
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

async function parsePrimitive(prim: Primitive): Promise<ParsedPrimitive | null> {
  if (!prim) return null;
  if (prim.description) {
    prim.description = convertRelativeMarkdownLinksToAbsolute(
      prim.description,
      "https://docs.netlogo.org/",
    );
  }

  const [parsedDescription, parsedExamples] = await Promise.all([
    prim.description ? await parseMarkdown(prim.description) : null,
    prim.examples ? await parseMarkdown(buildExamples(prim)) : null,
  ]);

  return {
    ...prim,
    description: parsedDescription,
    examples: parsedExamples,
  };
}

function buildExamples(primitive: Primitive | null): string {
  return `<h5 class="m-0">${
    primitive?.examples
      ?.map(
        (ex: string) => `
  <span class="prim-example font-mono m-0 block [&_p]:m-0! [&_p]:font-bold">

  ${escapeHTML(ex)}

  </span>
  `,
      )
      .join("") ?? ""
  }</h5>`;
}

export { useNoPrimitive, usePrimitive };
