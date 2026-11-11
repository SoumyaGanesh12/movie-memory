import "server-only";
import { prisma } from "@/lib/db";

/** Saves the favorite movie for the given user. */
export async function setFavoriteMovie(userId: string, movie: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { favoriteMovie: movie },
    select: { id: true, favoriteMovie: true },
  });
}

/** Returns the user's favorite movie, or null if they haven't set one. */
export async function getFavoriteMovie(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { favoriteMovie: true },
  });
  return user?.favoriteMovie ?? null;
}