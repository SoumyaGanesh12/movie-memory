import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/** The normal client or a transaction client; both support the same queries. */
type DbClient = Prisma.TransactionClient;

/** The fact fields the app uses (userId stays internal). */
const factSelect = {
  id: true,
  movieTitle: true,
  content: true,
  createdAt: true,
} as const;

export type StoredFact = {
  id: string;
  movieTitle: string;
  content: string;
  createdAt: Date;
};

export function insertFact(
  userId: string,
  movieTitle: string,
  content: string,
  db: DbClient = prisma,
): Promise<StoredFact> {
  return db.fact.create({
    data: { userId, movieTitle, content },
    select: factSelect,
  });
}

/** The newest fact for this user and movie, or null. Uses the (userId, movieTitle, createdAt DESC) index. */
export function getLatestFact(
  userId: string,
  movieTitle: string,
  db: DbClient = prisma,
): Promise<StoredFact | null> {
  return db.fact.findFirst({
    where: { userId, movieTitle },
    orderBy: { createdAt: "desc" },
    select: factSelect,
  });
}

/**
 * Runs `fn` while holding a Postgres advisory lock for this user + movie.
 * Concurrent calls with the same key wait their turn; the lock is released
 * automatically when the transaction ends, even if `fn` throws.
 */
export function withFactLock<T>(
  userId: string,
  movieTitle: string,
  fn: (tx: DbClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${movieTitle}))`;
      return fn(tx);
    },
    // Long enough to wait for another request's OpenAI call to finish.
    { timeout: 30_000, maxWait: 10_000 },
  );
}