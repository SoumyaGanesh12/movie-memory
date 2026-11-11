import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { CACHE_WINDOW_MS, getFact } from "@/lib/facts/service";
import { createFact, createUser, resetDatabase } from "../../helpers/db";
import { fakeGenerator } from "../../helpers/fake-generator";

beforeEach(resetDatabase);

describe("getFact", () => {
  it("generates, stores and returns a fact for the user's movie", async () => {
    const user = await createUser({ favoriteMovie: "Inception" });
    const generator = fakeGenerator("A fun fact.");

    const result = await getFact(user.id, generator);

    expect(result).toMatchObject({
      ok: true,
      source: "generated",
      fact: { movieTitle: "Inception", content: "A fun fact." },
    });
    expect(generator.generate).toHaveBeenCalledWith("Inception");
    expect(await prisma.fact.count({ where: { userId: user.id } })).toBe(1);
  });

  it("returns no_movie and skips generation when the user has no movie", async () => {
    const user = await createUser({ favoriteMovie: null });
    const generator = fakeGenerator();

    const result = await getFact(user.id, generator);

    expect(result).toMatchObject({ ok: false, reason: "no_movie" });
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("stores nothing when the movie is unknown", async () => {
    const user = await createUser({ favoriteMovie: "Zxqv Blorp" });

    const result = await getFact(user.id, fakeGenerator(null));

    expect(result).toMatchObject({ ok: false, reason: "unknown_movie" });
    expect(await prisma.fact.count()).toBe(0);
  });

  it("returns generation_failed and stores nothing when the generator throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // keep test output clean
    const user = await createUser({ favoriteMovie: "Inception" });

    const result = await getFact(user.id, fakeGenerator(new Error("API down")));

    expect(result).toMatchObject({ ok: false, reason: "generation_failed" });
    expect(await prisma.fact.count()).toBe(0);
  });
});

describe("getFact cache window", () => {
  it("returns the latest fact when it is under 60 seconds old", async () => {
    const user = await createUser({ favoriteMovie: "Inception" });
    const cached = await createFact(user.id, "Inception", CACHE_WINDOW_MS - 30_000);
    const generator = fakeGenerator();

    const result = await getFact(user.id, generator);

    expect(result).toMatchObject({ ok: true, source: "cache", fact: { id: cached.id } });
    expect(generator.generate).not.toHaveBeenCalled();
    expect(await prisma.fact.count()).toBe(1);
  });

  it("generates a new fact when the latest is over 60 seconds old", async () => {
    const user = await createUser({ favoriteMovie: "Inception" });
    await createFact(user.id, "Inception", CACHE_WINDOW_MS + 1_000);
    const generator = fakeGenerator("A newer fact.");

    const result = await getFact(user.id, generator);

    expect(result).toMatchObject({ ok: true, source: "generated", fact: { content: "A newer fact." } });
    expect(generator.generate).toHaveBeenCalledOnce();
    expect(await prisma.fact.count()).toBe(2);
  });

  it("treats a fact exactly 60 seconds old as expired", async () => {
    const user = await createUser({ favoriteMovie: "Inception" });
    await createFact(user.id, "Inception", CACHE_WINDOW_MS);

    const result = await getFact(user.id, fakeGenerator());

    expect(result).toMatchObject({ ok: true, source: "generated" });
  });

  it("does not reuse a fresh fact about a different movie", async () => {
    const user = await createUser({ favoriteMovie: "Inception" });
    await createFact(user.id, "Interstellar", 1_000);

    const result = await getFact(user.id, fakeGenerator());

    expect(result).toMatchObject({ ok: true, source: "generated", fact: { movieTitle: "Inception" } });
  });

  it("does not reuse another user's fresh fact", async () => {
    const user = await createUser({ favoriteMovie: "Inception" });
    const otherUser = await createUser({ favoriteMovie: "Inception" });
    await createFact(otherUser.id, "Inception", 1_000);

    const result = await getFact(user.id, fakeGenerator());

    expect(result).toMatchObject({ ok: true, source: "generated" });
  });
});