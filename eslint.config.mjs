/**
 * ESLint Configuration for Vamsa Monorepo
 * Includes TypeScript, React, React Hooks, and Accessibility (a11y) rules
 *
 * @ts-check
 * @type {import("eslint").Linter.Config[]}
 */
import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import { tanstackConfig } from "@tanstack/eslint-config";

// Type assertions for plugins with incompatible flat config types
/** @type {import("eslint").ESLint.Plugin} */
const reactHooks = /** @type {any} */ (reactHooksPlugin);
/** @type {import("eslint").ESLint.Plugin} */
const jsxA11y = /** @type {any} */ (jsxA11yPlugin);

export default defineConfig(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // TanStack ESLint configuration
  ...tanstackConfig,

  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.vinxi/**",
      "**/coverage/**",
      "**/test-output/**",
      "**/convex/_generated/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/vitest.config.ts",
      "**/postcss.config.mjs",
      "docs/**", // Documentation
      "site/**", // Ladle build output
      ".beads/**", // Project management
      "**/.stryker-tmp/**", // Stryker temp files
      "**/routeTree.gen.ts", // Auto-generated route tree
      "**/scripts/**", // Scripts directory
      "**/.ladle/**", // Ladle component browser config
      "**/tailwind.config.ts", // Tailwind config
      "**/drizzle.config.ts", // Drizzle config
      "**/drizzle-sqlite.config.ts", // Drizzle SQLite config
      "**/drizzle/schema.ts", // Drizzle schema (has own tsconfig)
      "**/tests/integration/**", // Integration tests (excluded from main tsconfig)
      "**/tests/setup/**", // Test setup files
      "**/tests/load/**", // k6 load test scripts (plain JS, not in tsconfig)
      "lighthouserc.js", // Lighthouse CI config (plain JS, not in tsconfig)
    ],
  },

  // Base configuration for all files
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },

  // TypeScript files configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",

      // Relax overly strict TanStack rules that flag defensive programming patterns
      // These rules are too aggressive for real-world code with runtime checks
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/require-await": "off",
      "no-shadow": "off",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  // React and JSX files configuration
  {
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React rules
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed in React 17+
      "react/prop-types": "off", // Using TypeScript
      "react/display-name": "off",
      "react/no-unescaped-entities": "warn",

      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Accessibility rules (jsx-a11y)
      ...jsxA11yPlugin.configs.recommended.rules,
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": [
        "error",
        {
          components: ["Link"],
          specialLink: ["to", "href"],
          aspects: ["invalidHref", "preferButton"],
        },
      ],
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/img-redundant-alt": "error",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          labelComponents: ["Label"],
          controlComponents: ["Input", "Select", "Textarea"],
          assert: "either",
          depth: 3,
        },
      ],
      "jsx-a11y/mouse-events-have-key-events": "warn",
      "jsx-a11y/no-access-key": "error",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-distracting-elements": "error",
      "jsx-a11y/no-interactive-element-to-noninteractive-role": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-to-interactive-role": "warn",
      "jsx-a11y/no-noninteractive-tabindex": "warn",
      "jsx-a11y/no-redundant-roles": "error",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/scope": "error",
      "jsx-a11y/tabindex-no-positive": "error",
    },
  },

  // Test files - relax some rules
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/e2e/**",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // Prettier must be last to override formatting rules
  prettierConfig
);
