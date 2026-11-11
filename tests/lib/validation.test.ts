import { describe, expect, it } from "vitest";
import { favoriteMovieSchema, MOVIE_TITLE_MAX } from "@/lib/validation";

describe("favoriteMovieSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(favoriteMovieSchema.parse("  Inception  ")).toBe("Inception");
  });

  it("rejects an empty title", () => {
    expect(favoriteMovieSchema.safeParse("").success).toBe(false);
  });

  it("rejects a title with only spaces", () => {
    expect(favoriteMovieSchema.safeParse("     ").success).toBe(false);
  });

  it("accepts a one-character title", () => {
    expect(favoriteMovieSchema.parse("M")).toBe("M");
  });

  it("accepts a title of exactly the maximum length", () => {
    const title = "a".repeat(MOVIE_TITLE_MAX);
    expect(favoriteMovieSchema.parse(title)).toBe(title);
  });

  it("rejects a title over the maximum length", () => {
    expect(favoriteMovieSchema.safeParse("a".repeat(MOVIE_TITLE_MAX + 1)).success).toBe(false);
  });

  it("measures length after trimming", () => {
    const padded = `  ${"a".repeat(MOVIE_TITLE_MAX)}  `;
    expect(favoriteMovieSchema.parse(padded)).toHaveLength(MOVIE_TITLE_MAX);
  });
});