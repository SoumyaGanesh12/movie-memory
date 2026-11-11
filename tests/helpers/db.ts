import { prisma } from "@/lib/db";

/** Deletes all users; their accounts and facts are removed by ON DELETE CASCADE. */
export async function resetDatabase() {
  await prisma.user.deleteMany();
}

/** Creates a test user with a unique email. */
export function createUser({ favoriteMovie = null }: { favoriteMovie?: string | null } = {}) {
  return prisma.user.create({
    data: {
      name: "Test User",
      email: `user-${crypto.randomUUID()}@test.dev`,
      favoriteMovie,
    },
  });
}

/** Creates a fact that is `ageMs` milliseconds old. */
export function createFact(userId: string, movieTitle: string, ageMs: number) {
  return prisma.fact.create({
    data: {
      userId,
      movieTitle,
      content: "A stored fact.",
      createdAt: new Date(Date.now() - ageMs),
    },
  });
}