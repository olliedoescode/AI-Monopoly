import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.config.js"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "react-dom/*"],
              message: "The engine must stay renderer-agnostic. No React.",
            },
            {
              group: ["three", "three/*", "@react-three/*"],
              message: "The engine must stay renderer-agnostic. No three.js.",
            },
            {
              group: ["zustand", "zustand/*", "pixi.js"],
              message: "The engine must not depend on UI state libraries.",
            },
          ],
        },
      ],
    },
  },
);
