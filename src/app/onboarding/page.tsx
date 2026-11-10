import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await requireUser();

  // Onboarding is first-time only.
  if (user.favoriteMovie) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome{user.name ? `, ${user.name}` : ""}!</h1>
        <p className="mt-1 text-gray-600">Tell us your favorite movie to get started.</p>
      </div>
      <OnboardingForm />
      <SignOutButton />
    </main>
  );
}