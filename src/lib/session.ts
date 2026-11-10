import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** Returns the logged-in user from the database, or null if not logged in. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({ where: { id: session.user.id } });
}

/** For protected pages: returns the user, or redirects to the landing page. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}