import { z } from "zod";

export const MOVIE_TITLE_MIN = 1;
export const MOVIE_TITLE_MAX = 100;

export const favoriteMovieSchema = z
  .string()
  .trim()
  .min(MOVIE_TITLE_MIN, "Please enter a movie title.")
  .max(MOVIE_TITLE_MAX, `Movie title must be at most ${MOVIE_TITLE_MAX} characters.`);