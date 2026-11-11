import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { UserAvatar } from "@/components/user-avatar";

export default async function DashboardPage() {
  const user = await requireUser();

  // Users must finish onboarding before seeing the dashboard.
  if (!user.favoriteMovie) redirect("/onboarding");

  // Google may not provide a name, so fall back to the email's first part.
  const displayName = user.name ?? user.email?.split("@")[0] ?? "there";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.name} email={user.email} image={user.image} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{displayName}</h1>
            {user.email && <p className="truncate text-gray-600">{user.email}</p>}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Favorite movie</p>
          <p className="mt-1 break-words text-lg font-medium">{user.favoriteMovie}</p>
        </div>

        <div className="mt-6 flex justify-end">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}