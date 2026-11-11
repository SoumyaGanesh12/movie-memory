"use client";

import { useEffect, useState } from "react";

type Fact = { content: string; movieTitle: string; createdAt: string };

type FactState =
  | { status: "loading" }
  | { status: "success"; fact: Fact }
  | { status: "error"; message: string };

async function fetchFact(): Promise<FactState> {
  try {
    const res = await fetch("/api/fact", { cache: "no-store" });
    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.fact) {
      return { status: "error", message: body?.error ?? "Something went wrong. Please try again." };
    }
    return { status: "success", fact: body.fact };
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }
}

export function FactCard() {
  const [state, setState] = useState<FactState>({ status: "loading" });

  // Load a fact when the dashboard opens.
  useEffect(() => {
    let ignore = false;
    fetchFact().then((result) => {
      if (!ignore) setState(result);
    });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleNewFact() {
    setState({ status: "loading" });
    setState(await fetchFact());
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">Fun fact</p>

      <div className="mt-2 min-h-12" aria-live="polite">
        {state.status === "loading" && (
          <p className="animate-pulse text-gray-400">Finding a fun fact…</p>
        )}
        {state.status === "error" && <p className="text-red-600">{state.message}</p>}
        {state.status === "success" && <p className="text-gray-900">{state.fact.content}</p>}
      </div>

      <button
        type="button"
        onClick={handleNewFact}
        disabled={state.status === "loading"}
        className="mt-3 text-sm font-medium text-gray-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.status === "error" ? "Try again" : "Get another fact"}
      </button>
    </div>
  );
}