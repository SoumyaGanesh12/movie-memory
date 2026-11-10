"use client";

import { useActionState, useState } from "react";
import { saveFavoriteMovie, type OnboardingState } from "./actions";
import { MOVIE_TITLE_MAX } from "@/lib/validation";

const initialState: OnboardingState = { error: null, value: "" };

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(saveFavoriteMovie, initialState);
  const [text, setText] = useState(state.value);

  // Same rule as the server: length is measured after trimming.
  const trimmedLength = text.trim().length;
  const isTooLong = trimmedLength > MOVIE_TITLE_MAX;
  const canSave = trimmedLength > 0 && !isTooLong && !isPending;

  // Instant feedback for length; server errors show until the user edits the text.
  const clientError = isTooLong
    ? `Movie title must be at most ${MOVIE_TITLE_MAX} characters.`
    : null;
  const serverError = text === state.value ? state.error : null;
  const error = clientError ?? serverError;

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <label htmlFor="favoriteMovie" className="text-sm font-medium">
        What&apos;s your favorite movie?
      </label>
      <input
        id="favoriteMovie"
        name="favoriteMovie"
        type="text"
        defaultValue={state.value}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Inception"
        disabled={isPending}
        aria-invalid={error ? true : undefined}
        aria-describedby="favoriteMovie-help"
        className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black aria-invalid:border-red-500"
      />
      <div id="favoriteMovie-help" className="flex justify-between gap-4 text-sm">
        <span role="alert" className="text-red-600">
          {error}
        </span>
        <span className={isTooLong ? "text-red-600" : "text-gray-500"}>
          {trimmedLength}/{MOVIE_TITLE_MAX}
        </span>
      </div>
      <button
        type="submit"
        disabled={!canSave}
        className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}