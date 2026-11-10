import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();

  // Logged in: first-time users go to onboarding, returning users to the dashboard.
  if (user) {
    redirect(user.favoriteMovie ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-semibold">Movie Memory</h1>
      <p className="max-w-md text-center text-gray-600">
        Save your favorite movie and discover fun facts about it.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-black px-5 py-2.5 text-white hover:bg-gray-800"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}