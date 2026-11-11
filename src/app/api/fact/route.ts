import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFact } from "@/lib/facts/service";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  // Only the session decides whose fact this is.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401, headers: NO_STORE });
  }

  const result = await getFact(session.user.id);

  if (!result.ok) {
    const status =
      result.reason === "no_movie" ? 409 : result.reason === "unknown_movie" ? 422 : 503;
    return NextResponse.json({ error: result.message }, { status, headers: NO_STORE });
  }

  return NextResponse.json(
    {
      fact: {
        content: result.fact.content,
        movieTitle: result.fact.movieTitle,
        createdAt: result.fact.createdAt,
      },
      source: result.source,
    },
    { headers: NO_STORE },
  );
}