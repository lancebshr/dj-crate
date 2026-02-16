import { normalizeArtist } from "../bpm/normalize";
import { normalizeSimpleGenres } from "../genre-taxonomy";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";
const CONCURRENCY = 10;
const DELAY_MS = 50;

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Get a Spotify access token via client credentials flow (no user auth). */
async function getClientToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify token error: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

// In-memory artist genre cache (avoids re-searching the same artist)
const artistGenreCache = new Map<string, string[]>();

/**
 * Look up genres for tracks via Spotify's artist search.
 * Uses client credentials flow — no user OAuth needed.
 * Groups tracks by artist to minimize API calls.
 */
export async function lookupGenresViaSpotify(
  tracks: Array<{ trackId: string; trackName: string; artistName: string }>,
  clientId: string,
  clientSecret: string
): Promise<Array<{ trackId: string; genres: string[] }>> {
  const token = await getClientToken(clientId, clientSecret);

  // Group tracks by normalized artist name
  const artistGroups = new Map<
    string,
    Array<{ trackId: string; artistName: string }>
  >();
  for (const track of tracks) {
    const key = normalizeArtist(track.artistName).toLowerCase();
    const group = artistGroups.get(key) ?? [];
    group.push({ trackId: track.trackId, artistName: track.artistName });
    artistGroups.set(key, group);
  }

  // Look up each unique artist with concurrency
  const artistKeys = [...artistGroups.keys()];
  const queue = [...artistKeys];

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, queue.length) },
    async () => {
      while (queue.length > 0) {
        const artistKey = queue.shift();
        if (!artistKey) break;

        if (artistGenreCache.has(artistKey)) continue;

        const group = artistGroups.get(artistKey)!;
        const artistName = normalizeArtist(group[0].artistName);

        try {
          const searchUrl = `${API_BASE}/search?q=artist:${encodeURIComponent(artistName)}&type=artist&limit=5`;
          const res = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.status === 429) {
            const retryAfter = Number(res.headers.get("Retry-After") || "1");
            await sleep(retryAfter * 1000);
            queue.push(artistKey); // retry
            continue;
          }

          if (res.ok) {
            const data = await res.json();
            const artists = data?.artists?.items ?? [];
            const best = findBestMatch(artists, artistName);
            if (best?.genres && best.genres.length > 0) {
              const normalized = normalizeSimpleGenres(best.genres);
              artistGenreCache.set(artistKey, normalized);
            } else {
              artistGenreCache.set(artistKey, []);
            }
          } else {
            artistGenreCache.set(artistKey, []);
          }
        } catch {
          artistGenreCache.set(artistKey, []);
        }

        if (queue.length > 0) await sleep(DELAY_MS);
      }
    }
  );

  await Promise.all(workers);

  // Map artist genres back to all tracks
  const results: Array<{ trackId: string; genres: string[] }> = [];
  for (const track of tracks) {
    const key = normalizeArtist(track.artistName).toLowerCase();
    const genres = artistGenreCache.get(key) ?? [];
    if (genres.length > 0) {
      results.push({ trackId: track.trackId, genres });
    }
  }

  return results;
}

function findBestMatch(
  artists: Array<{ name: string; genres?: string[]; popularity?: number }>,
  target: string
): { genres: string[] } | null {
  if (artists.length === 0) return null;
  const lower = target.toLowerCase();

  // Exact match
  for (const a of artists) {
    if (a.name.toLowerCase() === lower && a.genres && a.genres.length > 0) {
      return { genres: a.genres };
    }
  }

  // Starts-with
  for (const a of artists) {
    const aLower = a.name.toLowerCase();
    if (
      (aLower.startsWith(lower) || lower.startsWith(aLower)) &&
      a.genres &&
      a.genres.length > 0
    ) {
      return { genres: a.genres };
    }
  }

  // Any with genres
  for (const a of artists) {
    if (a.genres && a.genres.length > 0) return { genres: a.genres };
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
