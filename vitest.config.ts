import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["platform/**/*.test.ts", "lib/**/*.test.ts"],
  },
});
