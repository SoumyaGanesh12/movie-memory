import "server-only";
import { getFavoriteMovie } from "@/lib/users";
import { openAIFactGenerator, type FactGenerator } from "./generator";
import { getLatestFact, insertFact, withFactLock, type StoredFact } from "./repository";

/** A fact younger than this is returned instead of generating a new one. */
export const CACHE_WINDOW_MS = 60_000;

/** Where the returned fact came from. */
export type FactSource = "generated" | "cache" | "fallback";

export type FactResult =
  | { ok: true; fact: StoredFact; source: FactSource }
  | { ok: false; reason: "no_movie" | "unknown_movie" | "generation_failed"; message: string };

function isFresh(fact: StoredFact | null): fact is StoredFact {
  return fact !== null && Date.now() - fact.createdAt.getTime() < CACHE_WINDOW_MS;
}

/**
 * Returns a fun fact about the user's favorite movie.
 * Policy: reuse the latest fact if it is less than 60 seconds old; otherwise generate and store a new one.
 * Concurrent requests for the same user + movie are serialized, so only one of them generates.
 * If generation fails (timeout or error), returns the most recent stored fact for this movie, if any.
 */
export async function getFact(
  userId: string,
  generator: FactGenerator = openAIFactGenerator,
): Promise<FactResult> {
  const movieTitle = await getFavoriteMovie(userId);
  if (!movieTitle) {
    return { ok: false, reason: "no_movie", message: "Set a favorite movie first." };
  }

  // Fast path: a fresh fact needs no lock.
  const latest = await getLatestFact(userId, movieTitle);
  if (isFresh(latest)) {
    return { ok: true, fact: latest, source: "cache" };
  }

  try {
    return await withFactLock(userId, movieTitle, async (tx): Promise<FactResult> => {
      // Re-check under the lock: a concurrent request may have just generated a fact.
      const latestInLock = await getLatestFact(userId, movieTitle, tx);
      if (isFresh(latestInLock)) {
        return { ok: true, fact: latestInLock, source: "cache" };
      }

      const content = await generator.generate(movieTitle);
      if (content === null) {
        return {
          ok: false,
          reason: "unknown_movie",
          message: `We couldn't find any facts about "${movieTitle}". Check the spelling of the title.`,
        };
      }

      const fact = await insertFact(userId, movieTitle, content, tx);
      return { ok: true, fact, source: "generated" };
    });
  } catch (err) {
    console.error("Fact generation failed", err);

    // Fall back to the most recent fact for this movie, however old.
    const fallback = await getLatestFact(userId, movieTitle).catch(() => null);
    if (fallback) {
      return { ok: true, fact: fallback, source: "fallback" };
    }

    return {
      ok: false,
      reason: "generation_failed",
      message: "We couldn't come up with a fun fact right now. Please try again.",
    };
  }
}