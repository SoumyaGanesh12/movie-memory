import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";

export default async function OnboardingPage() {
  const user = await requireUser();

  // Onboarding is first-time only.
  if (user.favoriteMovie) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Onboarding (coming next)</h1>
      <p className="text-gray-600">Signed in as {user.email}</p>
      <SignOutButton />
    </main>
  );
}