import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the session and the AI call; everything else (route, service, database) is real.
const { authMock, generateMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  generateMock: vi.fn(async () => "A fun fact."),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/facts/generator", () => ({ openAIFactGenerator: { generate: generateMock } }));

import { GET } from "@/app/api/fact/route";
import { createFact, createUser, resetDatabase } from "../../../helpers/db";

function signInAs(userId: string | null) {
  authMock.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

beforeEach(async () => {
  await resetDatabase();
  authMock.mockReset();
  generateMock.mockClear();
});

describe("GET /api/fact authorization", () => {
  it("returns 401 and generates nothing when not signed in", async () => {
    signInAs(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("never returns another user's fact, even a fresh one for the same movie", async () => {
    const alice = await createUser({ favoriteMovie: "Inception" });
    const bob = await createUser({ favoriteMovie: "Inception" });
    const bobsFact = await createFact(bob.id, "Inception", 1_000); // fresh, would be "cached" for Bob
    signInAs(alice.id);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("generated");
    expect(body.fact.content).toBe("A fun fact.");
    expect(body.fact.content).not.toBe(bobsFact.content);
  });

  it("does not expose user ids in the response", async () => {
    const alice = await createUser({ favoriteMovie: "Inception" });
    signInAs(alice.id);

    const body = await (await GET()).json();

    expect(body.fact).not.toHaveProperty("userId");
    expect(JSON.stringify(body)).not.toContain(alice.id);
  });

  it("returns 409 for a signed-in user who has no favorite movie", async () => {
    const alice = await createUser({ favoriteMovie: null });
    signInAs(alice.id);

    const res = await GET();

    expect(res.status).toBe(409);
    expect(generateMock).not.toHaveBeenCalled();
  });
});