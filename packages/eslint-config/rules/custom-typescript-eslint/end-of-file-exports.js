import createTypescriptRule from "./helpers.js";

/**
 * @typedef {'exportsNotAtEnd' | 'typeExportsNotAtEnd'} MessageIds
 */

/**
 * @typedef {Object} Options
 * @property {Boolean} enforceTypeExports
 * @property {Boolean} enforceNonTypeExports
 */

/**
 * @typedef {'typeExports' | 'nonTypeExports' | 'exportComponents'} NodeMapKeys
 * @type {Record<NodeMapKeys, string[]>}
 */
const nodeMap = {
  typeExports: ["TSExportAssignment", "TSExportDeclaration"],
  nonTypeExports: ["ExportNamedDeclaration", "ExportDefaultDeclaration", "ExportAllDeclaration"],
  exportComponents: ["ExportSpecifier", "Identifier"],
};

const endOfFileExports = createTypescriptRule({
  name: "custom-typescript-eslint/end-of-file-exports",
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce that all exports are at the end of the file.",
    },
    schema: [
      {
        type: "object",
        properties: {
          enforceTypeExports: { type: "boolean", default: true },
          enforceNonTypeExports: { type: "boolean", default: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      exportsNotAtEnd: "All exports should be at the end of the file.",
    },
  },
  defaultOptions: [{ enforceTypeExports: true, enforceNonTypeExports: true }],
  create(context, [options]) {
    let hasSeenExport = false;
    let insideExport = false;

    let exportNodes = new Set();

    if (options.enforceNonTypeExports) {
      nodeMap.nonTypeExports.forEach((node) => exportNodes.add(node));
    }
    if (options.enforceTypeExports) {
      nodeMap.typeExports.forEach((node) => exportNodes.add(node));
    }

    const exportSelector = [...Array.from(exportNodes)].join(", ");
    const nonExportSelector = `:not(${[...nodeMap.typeExports, ...nodeMap.nonTypeExports, ...nodeMap.exportComponents].join(", ")})`;

    const onExitExport = () => {
      insideExport = false;
    };
    const exitListeners = Object.fromEntries(
      Array.from(exportNodes).map((node) => [`${node}:exit`, onExitExport]),
    );

    return {
      Program() {
        hasSeenExport = false;
      },
      [exportSelector]: (node) => {
        hasSeenExport = true;
        insideExport = true;
        return;
      },
      ...exitListeners,
      [nonExportSelector]: (node) => {
        if (hasSeenExport && !insideExport) {
          context.report({ node, messageId: "exportsNotAtEnd" });
        }
      },
    };
  },
});

export default endOfFileExports;
