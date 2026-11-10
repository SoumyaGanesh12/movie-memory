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