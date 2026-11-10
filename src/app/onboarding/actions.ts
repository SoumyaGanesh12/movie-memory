"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { setFavoriteMovie } from "@/lib/users";
import { favoriteMovieSchema } from "@/lib/validation";

export type OnboardingState = { error: string | null; value: string };

export async function saveFavoriteMovie(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  // 1. Who is asking? Only the session decides.
  const user = await requireUser();

  // 2. Onboarding is first-time only.
  if (user.favoriteMovie) redirect("/dashboard");

  // 3. Validate on the server (trim + length).
  const raw = formData.get("favoriteMovie");
  const input = typeof raw === "string" ? raw : "";
  const parsed = favoriteMovieSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid movie title.", value: input };
  }

  // 4. Save, with a friendly message if the database fails.
  try {
    await setFavoriteMovie(user.id, parsed.data);
  } catch (err) {
    console.error("Failed to save favorite movie", err);
    return { error: "Something went wrong saving your movie. Please try again.", value: input };
  }

  redirect("/dashboard");
}