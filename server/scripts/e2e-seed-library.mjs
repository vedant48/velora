#!/usr/bin/env node
/**
 * Seeds the LOCAL e2e backend (127.0.0.1:8787) with a small library for
 * e2e_alice so the Explore "For you" rails, Want/Watched grids and Watch next
 * have real data. Poster paths come from the live TMDB proxy at run time.
 * Synthetic data only; idempotent per fresh local D1.
 */
const API = 'http://127.0.0.1:8787/api';
const TMDB_PROXY = process.env.TMDB_PROXY ?? 'https://proxy-api-server-f1an.onrender.com';
const ALICE = { username: 'e2e_alice', password: 'e2e-alice-pass-1' };

// [tmdbId, status, rating, episodesWatched, totalEpisodes]
const MOVIES = [
  [550, 'watched', 9],   // Fight Club
  [680, 'watched', 8],   // Pulp Fiction
  [157336, 'want', null], // Interstellar
];
const SHOWS = [
  [1399, 'watching', 9, 5, 10], // Game of Thrones s1 progress
  [1396, 'watched', 8, 7, 7],   // Breaking Bad s1 done
];

async function req(path, options = {}, token) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function tmdb(path) {
  const res = await fetch(`${TMDB_PROXY}/v1/tmdb/3${path}`);
  if (!res.ok) throw new Error(`tmdb ${path} -> ${res.status}`);
  return res.json();
}

const { token } = await req('/auth/login', { method: 'POST', body: JSON.stringify(ALICE) });

for (const [id, status, rating] of MOVIES) {
  const d = await tmdb(`/movie/${id}`);
  await req(`/library/movie/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ mediaType: 'movie', tmdbId: id, title: d.title, posterPath: d.poster_path, backdropPath: d.backdrop_path, releaseDate: d.release_date, status }),
  }, token);
  if (rating) await req(`/reviews/movie/${id}`, { method: 'PUT', body: JSON.stringify({ rating, seasonNumber: 0 }) }, token);
  console.log(`seeded movie ${id} ${d.title} ${status}${rating ? ` rated ${rating}` : ''}`);
}

for (const [id, status, rating, watched, total] of SHOWS) {
  const d = await tmdb(`/tv/${id}`);
  await req(`/library/tv/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ mediaType: 'tv', tmdbId: id, title: d.name, posterPath: d.poster_path, backdropPath: d.backdrop_path, releaseDate: d.first_air_date, status, episodesWatched: watched, totalEpisodes: total }),
  }, token);
  if (rating) await req(`/reviews/tv/${id}`, { method: 'PUT', body: JSON.stringify({ rating, seasonNumber: 1 }) }, token);
  console.log(`seeded tv ${id} ${d.name} ${status} ${watched}/${total}${rating ? ` s1 rated ${rating}` : ''}`);
}

const { items } = await req('/library', {}, token);
console.log(`library now holds ${items.length} items`);
