import "server-only";
import { getFavoriteMovie } from "@/lib/users";
import { openAIFactGenerator, type FactGenerator } from "./generator";
import { insertFact, type StoredFact } from "./repository";

/** Where the returned fact came from. */
export type FactSource = "generated";

export type FactResult =
  | { ok: true; fact: StoredFact; source: FactSource }
  | { ok: false; reason: "no_movie" | "unknown_movie" | "generation_failed"; message: string };

/**
 * Returns a fun fact about the user's favorite movie.
 * Base policy: generate a new fact on every request and store it.
 */
export async function getFact(
  userId: string,
  generator: FactGenerator = openAIFactGenerator,
): Promise<FactResult> {
  const movieTitle = await getFavoriteMovie(userId);
  if (!movieTitle) {
    return { ok: false, reason: "no_movie", message: "Set a favorite movie first." };
  }

  try {
    const content = await generator.generate(movieTitle);
    if (content === null) {
      return {
        ok: false,
        reason: "unknown_movie",
        message: `We couldn't find any facts about "${movieTitle}". Check the spelling of the title.`,
      };
    }
    const fact = await insertFact(userId, movieTitle, content);
    return { ok: true, fact, source: "generated" };
  } catch (err) {
    console.error("Fact generation failed", err);
    return {
      ok: false,
      reason: "generation_failed",
      message: "We couldn't come up with a fun fact right now. Please try again.",
    };
  }
}