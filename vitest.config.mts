import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // "server-only" throws outside Next.js; tests run in plain Node, so stub it.
      "server-only": fromRoot("./tests/setup/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/setup/global-setup.ts"],
    setupFiles: ["./tests/setup/setup.ts"],
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
    // Undo vi.spyOn mocks after each test.
    restoreMocks: true,
  },
});