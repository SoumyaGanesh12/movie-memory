import "server-only";
import { getFavoriteMovie } from "@/lib/users";
import { openAIFactGenerator, type FactGenerator } from "./generator";
import { getLatestFact, insertFact, type StoredFact } from "./repository";

/** A fact younger than this is returned instead of generating a new one. */
export const CACHE_WINDOW_MS = 60_000;

/** Where the returned fact came from. */
export type FactSource = "generated" | "cache";

export type FactResult =
  | { ok: true; fact: StoredFact; source: FactSource }
  | { ok: false; reason: "no_movie" | "unknown_movie" | "generation_failed"; message: string };

/**
 * Returns a fun fact about the user's favorite movie.
 * Policy: reuse the latest fact if it is less than 60 seconds old; otherwise generate and store a new one.
 */
export async function getFact(
  userId: string,
  generator: FactGenerator = openAIFactGenerator,
): Promise<FactResult> {
  const movieTitle = await getFavoriteMovie(userId);
  if (!movieTitle) {
    return { ok: false, reason: "no_movie", message: "Set a favorite movie first." };
  }

  const latest = await getLatestFact(userId, movieTitle);
  if (latest && Date.now() - latest.createdAt.getTime() < CACHE_WINDOW_MS) {
    return { ok: true, fact: latest, source: "cache" };
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