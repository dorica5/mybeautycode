import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks"; // ✅ Import plugin correctly

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  { // ✅ Correct format for ESLint 9+
    plugins: {
      "react-hooks": pluginReactHooks,  // ✅ Use an object instead of an array
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",  // ✅ Enforce proper hook usage
      "react-hooks/exhaustive-deps": "warn",  // 🔔 Warn about missing dependencies in useEffect
    }
  }
];
