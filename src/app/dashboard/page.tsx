import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const user = await requireUser();

  // Users must finish onboarding before seeing the dashboard.
  if (!user.favoriteMovie) redirect("/onboarding");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Dashboard (coming soon)</h1>
      <p className="text-gray-600">Signed in as {user.email}</p>
      <SignOutButton />
    </main>
  );
}