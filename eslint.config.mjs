import js from "@eslint/js";
import ts from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import playwright from "eslint-plugin-playwright";
import vitest from "@vitest/eslint-plugin";
import importX from "eslint-plugin-import-x";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";

const testFiles = ["**/*.test.ts", "**/*.test.tsx"];

export default ts.config(
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "apps/web/out/**",
      "apps/web/public/maplibre/**",
      "**/next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
      "coverage/**",
      ".stryker-tmp/**",
      "reports/**",
      "**/__screenshots__/**",
      "apps/web/test/public/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs,cjs}"],
    plugins: { "import-x": importX, unicorn },
    rules: {
      "import-x/no-self-import": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-relative-packages": "error",
      "unicorn/prefer-node-protocol": "error",
      "unicorn/no-instanceof-builtins": "error",
      "unicorn/no-useless-spread": "error",
      "unicorn/prefer-array-flat-map": "error",
      "unicorn/prefer-string-slice": "error",
      "unicorn/no-typeof-undefined": "error",
      "unicorn/throw-new-error": "error",
      "unicorn/error-message": "error",
    },
    settings: {
      "import-x/resolver": { node: { extensions: [".ts", ".tsx", ".js"] } },
    },
  },
  {
    files: ["**/*.tsx"],
    ...eslintReact.configs["recommended-typescript"],
    rules: {
      ...eslintReact.configs["recommended-typescript"].rules,
      ...eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"]
        .rules,
      "@eslint-react/exhaustive-deps": "off",
      "@eslint-react/naming-convention-ref-name": "off",
      "@eslint-react/no-array-index-key": "off",
      "@eslint-react/set-state-in-effect": "off",
    },
  },
  {
    files: ["**/*.tsx"],
    ...jsxA11y.flatConfigs.recommended,
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { roles: ["region", "group"] },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/purity": "error",
      "react-hooks/immutability": "error",
      "react-hooks/set-state-in-render": "error",
      "react-hooks/error-boundaries": "error",
    },
  },
  {
    files: testFiles,
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": [
        "error",
        { assertFunctionNames: ["expect", "fc.assert"] },
      ],
      "vitest/no-disabled-tests": "error",
      "vitest/no-focused-tests": "error",
      "vitest/no-identical-title": "error",
      "vitest/no-conditional-tests": "error",
      "vitest/no-standalone-expect": "error",
      "vitest/prefer-hooks-in-order": "error",
      "vitest/require-top-level-describe": "off",
    },
    languageOptions: { globals: { ...vitest.environments.env.globals } },
  },
  {
    files: ["e2e/**/*.ts", "playwright.config.ts"],
    ...playwright.configs["flat/recommended"],
    rules: {
      ...playwright.configs["flat/recommended"].rules,
      "playwright/no-focused-test": "error",
      "playwright/no-skipped-test": "error",
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-conditional-in-test": "error",
      "playwright/no-conditional-expect": "error",
      "playwright/expect-expect": "error",
      "playwright/prefer-web-first-assertions": "error",
      "playwright/no-element-handle": "error",
      "playwright/no-eval": "error",
      "playwright/no-networkidle": "error",
      "playwright/prefer-to-have-count": "error",
    },
  },
  {
    files: ["**/*.mjs", "**/*.cjs"],
    languageOptions: { globals: { ...globals.node } },
  },
);
