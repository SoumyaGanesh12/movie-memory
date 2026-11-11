import { vi } from "vitest";
import type { FactGenerator } from "@/lib/facts/generator";

/**
 * A stand-in for OpenAI: returns the given fact, returns null (unknown movie),
 * or throws (API failure). vi.fn records every call, so tests can check usage.
 */
export function fakeGenerator(result: string | null | Error = "A fun fact.") {
  return {
    generate: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  } satisfies FactGenerator;
}