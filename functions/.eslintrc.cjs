module.exports = {
  root: true,
  // Don't try to lint compiled output or node_modules or this config file
  ignorePatterns: ["lib/**", "node_modules/**", ".eslintrc.cjs"],
  // Default env for the project
  env: { es6: true, node: true },
  // ---- Lint TypeScript source files ----
  overrides: [
    {
      files: ["src/**/*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json", "./tsconfig.dev.json"],
        sourceType: "module",
      },
      plugins: ["@typescript-eslint"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
      ],
      rules: {
        // place any TS rules you want here
      },
    },
    // ---- Lint plain JS / CJS config files WITHOUT the TS project ----
    {
      files: ["*.js", "*.cjs"],
      // Use the default JS parser so ESLint doesn't try to use the TS project
      parser: "espree",
    },
  ],
};
