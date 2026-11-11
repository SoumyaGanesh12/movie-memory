import { vi } from "vitest";
import type { FactGenerator } from "@/lib/facts/generator";

/**
 * A stand-in for OpenAI: returns the given fact, returns null (unknown movie),
 * or throws (API failure). vi.fn records every call, so tests can check usage.
 * `delayMs` simulates a slow API call, which is needed to test concurrent requests.
 */
export function fakeGenerator(
  result: string | null | Error = "A fun fact.",
  { delayMs = 0 }: { delayMs?: number } = {},
) {
  return {
    generate: vi.fn(async () => {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (result instanceof Error) throw result;
      return result;
    }),
  } satisfies FactGenerator;
}