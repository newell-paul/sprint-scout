/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "ui-must-not-implement-ranking",
      comment:
        "design.md: the UI never implements ranking maths. Apps reach providers and the database only through @scout/application.",
      severity: "error",
      from: { path: "^apps/web/" },
      to: { path: "^packages/(providers|database)/" },
    },
    {
      name: "analysis-is-pure",
      comment:
        "@scout/analysis is the deterministic core and may depend only on @scout/contracts.",
      severity: "error",
      from: { path: "^packages/analysis/" },
      to: { path: "^packages/(?!analysis|contracts)/" },
    },
    {
      name: "contracts-are-leaves",
      severity: "error",
      from: { path: "^packages/contracts/" },
      to: { path: "^packages/(?!contracts)/|^apps/" },
    },
    {
      name: "packages-never-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)tsconfig",
          "\\.config\\.(js|cjs|mjs|ts)$",
          "^e2e/",
          "^apps/web/test/",
          "^packages/testing/src/vitest-commands\\.ts$",
          "\\.server\\.tsx?$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "node_modules|\\.next|/dist/|/out/|test-results|playwright-report|coverage",
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
