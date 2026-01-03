import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";

export default [
  // Next.js flat config (includes React, TypeScript, core-web-vitals)
  ...nextConfig,

  // Additional ignores
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "test-output/**",
      "*.config.js",
      "*.config.mjs",
      "postcss.config.mjs",
    ],
  },

  // Custom TypeScript rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },


  // Prettier config (must be last to override other formatting rules)
  prettierConfig,
];
