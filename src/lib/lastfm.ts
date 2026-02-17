import { normalizeArtist } from "./bpm/normalize";
import { normalizeSimpleGenres } from "./genre-taxonomy";

const API_BASE = "https://ws.audioscrobbler.com/2.0";
const CONCURRENCY = 8;
const DELAY_MS = 50;

// In-memory artist cache so we never look up the same artist twice
const artistTagCache = new Map<string, string[]>();

export async function lookupGenresViaLastFm(
  tracks: Array<{ trackId: string; trackName: string; artistName: string }>,
  apiKey: string
): Promise<Array<{ trackId: string; genres: string[] }>> {
  // Group tracks by normalized artist
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

  // Build queue of unique artists that need lookup
  const queue: string[] = [];
  for (const key of artistGroups.keys()) {
    if (!artistTagCache.has(key)) {
      queue.push(key);
    }
  }

  // Look up artists concurrently
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, queue.length) },
    async () => {
      while (queue.length > 0) {
        const artistKey = queue.shift();
        if (!artistKey) break;
        if (artistTagCache.has(artistKey)) continue;

        const group = artistGroups.get(artistKey)!;
        const artistName = normalizeArtist(group[0].artistName);

        try {
          const url = `${API_BASE}/?method=artist.gettoptags&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json`;
          const res = await fetch(url);

          if (res.ok) {
            const data = await res.json();
            const tags: Array<{ name: string; count: string }> =
              data?.toptags?.tag ?? [];

            // Take tags with count > 0, extract genre strings
            const genreStrings = tags
              .filter((t) => parseInt(t.count, 10) > 5)
              .map((t) => t.name);

            if (genreStrings.length > 0) {
              const normalized = normalizeSimpleGenres(genreStrings);
              artistTagCache.set(artistKey, normalized);
            } else {
              artistTagCache.set(artistKey, []);
            }
          } else {
            artistTagCache.set(artistKey, []);
          }
        } catch {
          artistTagCache.set(artistKey, []);
        }

        if (queue.length > 0) await sleep(DELAY_MS);
      }
    }
  );

  await Promise.all(workers);

  // Map artist genres to tracks
  const results: Array<{ trackId: string; genres: string[] }> = [];
  for (const track of tracks) {
    const key = normalizeArtist(track.artistName).toLowerCase();
    const genres = artistTagCache.get(key) ?? [];
    if (genres.length > 0) {
      results.push({ trackId: track.trackId, genres });
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
