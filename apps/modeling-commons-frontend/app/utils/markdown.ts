import { parseMarkdown } from "#imports";
import { walk, WalkOptions } from "@repo/utils/std/graph";
type MDCBody = Awaited<ReturnType<typeof parseMarkdown>>["body"];
type MDCNode = MDCBody["children"][number];
type MDCElementNode = Extract<MDCNode, { type: "element" }>;
type MDCTextNode = Extract<MDCNode, { type: "text" }>;

export function isElementNode(node: MDCNode): node is MDCElementNode {
  return node.type === "element";
}

export function isTextNode(node: MDCNode): node is MDCTextNode {
  return node.type === "text";
}

export async function getFirstParagraphTextFromMarkdown(markdownString: string): Promise<string> {
  const {
    body: { children },
  } = await parseMarkdown(markdownString);
  let firstP: MDCElementNode | null = null;
  await walk<MDCNode, "children">(
    children,
    (node) => {
      if (isElementNode(node) && node.tag === "p") {
        firstP = node;
        return WalkOptions.EXIT;
      }
    },
    "children",
  );

  if (!firstP) return "";

  const parts: string[] = [];
  await walk<MDCNode, "children">(
    [firstP],
    (node) => {
      if (isTextNode(node)) parts.push(node.value ?? "");
    },
    "children",
  );

  return parts.join("");
}
