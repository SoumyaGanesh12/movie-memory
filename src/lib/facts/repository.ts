import "server-only";
import { prisma } from "@/lib/db";

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
): Promise<StoredFact> {
  return prisma.fact.create({
    data: { userId, movieTitle, content },
    select: factSelect,
  });
}

/** The newest fact for this user and movie, or null. Uses the (userId, movieTitle, createdAt DESC) index. */
export function getLatestFact(userId: string, movieTitle: string): Promise<StoredFact | null> {
  return prisma.fact.findFirst({
    where: { userId, movieTitle },
    orderBy: { createdAt: "desc" },
    select: factSelect,
  });
}