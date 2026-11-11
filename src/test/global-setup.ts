import "dotenv/config";
import { execSync } from "node:child_process";

export default function setup() {
  const testUrl = process.env.TEST_DATABASE_URL;

  // Safety guard: never run tests against the development database.
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is not set. See .env.example.");
  }
  if (testUrl === process.env.DATABASE_URL || !new URL(testUrl).pathname.includes("test")) {
    throw new Error("TEST_DATABASE_URL must be a separate database whose name contains 'test'.");
  }

  // Create the test database if needed and rebuild it from the committed migrations.
  execSync("npx prisma migrate reset --force", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}