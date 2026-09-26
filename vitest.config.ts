import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      // Test-only signing secret so lib/auth/session can load
      JWT_SECRET: "test-only-secret-not-used-anywhere-else",
    },
  },
});
