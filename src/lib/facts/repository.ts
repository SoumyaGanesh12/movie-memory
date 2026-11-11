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