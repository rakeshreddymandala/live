import globals from "globals";
import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import refresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: pluginReact,
      hooks,
      refresh,
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "hooks/rules-of-hooks": "error",
      "hooks/exhaustive-deps": "warn",
      "refresh/only-export-components": "warn",
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
];