import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // "server-only" throws outside Next.js; tests run in plain Node, so stub it.
      "server-only": fromRoot("./src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./src/test/global-setup.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
    // Undo vi.spyOn mocks after each test.
    restoreMocks: true,
  },
});