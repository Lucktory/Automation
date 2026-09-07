import tseslint from "typescript-eslint";

/**
 * Architectural enforcement.
 *
 * ARCHITECTURE.md states the rules; this file is what makes them real. A
 * standard that is only written down decays in three weeks — these fail the
 * build instead.
 *
 * See: ARCHITECTURE.md §1 (the Dependency Rule) and §4 (the no-hardcoding matrix).
 */

const FRAMEWORK_IMPORTS = [
  "next",
  "next/*",
  "react",
  "react-dom",
  "react/*",
  "@prisma/client",
  "next-intl",
  "next-intl/*",
];

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "prisma/schema.draft.prisma",
    ],
  },

  ...tseslint.configs.recommended,

  // ---------------------------------------------------------------------------
  // THE DEPENDENCY RULE
  // The domain layer is pure TypeScript. It may not know that Next, React or
  // Prisma exist. This is what lets the liquidation engine run identically on
  // the server and in the browser, and be tested with no database.
  // ---------------------------------------------------------------------------
  {
    files: ["src/core/**/*.ts", "src/modules/*/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: FRAMEWORK_IMPORTS,
              message:
                "Domain code must stay framework-free (ARCHITECTURE.md §1). Move this to application/ or infra/.",
            },
            {
              group: ["*/infra/*", "@/modules/*/infra/*"],
              message:
                "Dependencies point inward. Domain defines ports; infra implements them.",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // NO MAGIC NUMBERS IN THE DOMAIN
  // Every rate, fee and threshold is a ParameterSet row edited in /admin/parametros.
  // A number appearing in a pricing stage is a bug, not a value.
  // ---------------------------------------------------------------------------
  {
    files: ["src/modules/*/domain/**/*.ts"],
    rules: {
      "no-magic-numbers": [
        "error",
        {
          ignore: [-1, 0, 1, 2, 100],
          ignoreArrayIndexes: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // ENVIRONMENT ACCESS
  // src/config/env.ts is the only file that may read process.env. Everything
  // else imports the validated object, so a missing variable fails at boot with
  // a clear message rather than surfacing as `undefined` mid-calculation.
  // ---------------------------------------------------------------------------
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/config/env.ts", "src/i18n/request.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Read configuration through `env` from @/config/env — it is validated at boot.",
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // MODULE BOUNDARIES
  // Every module has exactly one public entry point. Deep imports make a module
  // impossible to change without breaking its consumers.
  // ---------------------------------------------------------------------------
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/modules/*/domain/*",
                "@/modules/*/application/*",
                "@/modules/*/infra/*",
              ],
              message:
                "Import from the module's public entry point (@/modules/<name>) instead of reaching into its internals.",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Scripts and tests are allowed to be pragmatic.
  // ---------------------------------------------------------------------------
  {
    files: ["scripts/**/*.mjs", "tests/**/*.ts", "*.config.{ts,mjs}"],
    rules: {
      "no-restricted-properties": "off",
      "no-magic-numbers": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
