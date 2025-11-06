import endOfFileExports from "./end-of-file-exports.js";

const plugin = {
  meta: {
    name: "custom-typescript-eslint",
  },
  rules: {
    "end-of-file-exports": endOfFileExports,
  },
};

export default plugin;
