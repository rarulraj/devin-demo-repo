import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // The paved road: applications request mutations, they do not write the
  // ledger or the state behind it. Only the shared mutation path may reach
  // platform internals.
  {
    files: ["app/**", "lib/**", "components/**", "platform/ui/**", "platform/shell/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/platform/internal/*", "../internal/*", "./internal/*"],
              message:
                "Platform internals are not an application API. Use mutate() to change state and platform/audit.ts to read the ledger.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
