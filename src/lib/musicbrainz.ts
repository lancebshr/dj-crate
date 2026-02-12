import { normalizeArtist } from "./bpm/normalize";
import { normalizeGenreTags, type RawTag } from "./genre-taxonomy";

const API_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "djprep/0.1.0 (https://github.com/lancebshr/dj-crate)";
const DELAY_MS = 1100; // MusicBrainz enforces 1 req/sec strictly

export interface GenreResult {
  trackId: string;
  genres: string[];
}

// In-memory cache so we never look up the same artist twice in one batch
const artistTagCache = new Map<string, string[]>();

export async function lookupGenres(
  tracks: Array<{ trackId: string; trackName: string; artistName: string }>
): Promise<GenreResult[]> {
  // Group tracks by normalized artist name
  const artistGroups = new Map<string, typeof tracks>();
  for (const track of tracks) {
    const key = normalizeArtist(track.artistName).toLowerCase();
    const group = artistGroups.get(key) ?? [];
    group.push(track);
    artistGroups.set(key, group);
  }

  // Look up each unique artist once
  for (const [artistKey, _group] of artistGroups) {
    if (artistTagCache.has(artistKey)) continue;

    const artistName = normalizeArtist(_group[0].artistName);
    const genres = await fetchArtistGenres(artistName);
    artistTagCache.set(artistKey, genres);

    // Respect rate limit
    await sleep(DELAY_MS);
  }

  // Apply artist genres to all tracks
  const results: GenreResult[] = [];
  for (const track of tracks) {
    const key = normalizeArtist(track.artistName).toLowerCase();
    const genres = artistTagCache.get(key) ?? [];
    results.push({ trackId: track.trackId, genres });
  }

  return results;
}

async function fetchArtistGenres(artistName: string): Promise<string[]> {
  try {
    // Step 1: Search for the artist
    const query = `artist:"${escapeQuery(artistName)}"`;
    const searchUrl = `${API_BASE}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=5`;

    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const artists = searchData?.artists ?? [];
    if (artists.length === 0) return [];

    // Find the best match
    const bestArtist = findBestArtistMatch(artists, artistName);
    if (!bestArtist) return [];

    // Use tags from search result if present
    const searchTags: RawTag[] = (bestArtist.tags ?? []).map(
      (t: { name: string; count: number }) => ({
        name: t.name,
        count: t.count ?? 0,
      })
    );

    if (searchTags.length >= 2) {
      searchTags.sort((a, b) => b.count - a.count);
      return normalizeGenreTags(searchTags);
    }

    // Step 2: If search didn't include enough tags, fetch artist detail
    const artistId = bestArtist.id;
    if (!artistId) return normalizeGenreTags(searchTags);

    await sleep(DELAY_MS);

    const detailUrl = `${API_BASE}/artist/${artistId}?inc=tags+genres&fmt=json`;
    const detailRes = await fetch(detailUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!detailRes.ok) return normalizeGenreTags(searchTags);

    const detail = await detailRes.json();

    // Combine MusicBrainz "genres" (curated) and "tags" (community)
    const genreEntries: RawTag[] = (detail.genres ?? []).map(
      (g: { name: string; count: number }) => ({
        name: g.name,
        count: (g.count ?? 0) + 100, // Boost official genres above tags
      })
    );

    const tagEntries: RawTag[] = (detail.tags ?? []).map(
      (t: { name: string; count: number }) => ({
        name: t.name,
        count: t.count ?? 0,
      })
    );

    const allTags = [...genreEntries, ...tagEntries];
    allTags.sort((a, b) => b.count - a.count);
    return normalizeGenreTags(allTags);
  } catch {
    return [];
  }
}

function findBestArtistMatch(
  artists: Array<{
    id: string;
    name: string;
    score?: number;
    tags?: Array<{ name: string; count: number }>;
    genres?: Array<{ name: string; count: number }>;
  }>,
  target: string
): (typeof artists)[number] | null {
  const lower = target.toLowerCase();

  // Exact name match
  for (const a of artists) {
    if (a.name.toLowerCase() === lower) return a;
  }

  // Starts-with match (handles "The X" vs "X")
  for (const a of artists) {
    const aLower = a.name.toLowerCase();
    if (aLower.startsWith(lower) || lower.startsWith(aLower)) return a;
  }

  // Use highest score from MusicBrainz
  if (artists[0]?.score && artists[0].score >= 80) return artists[0];

  return artists[0] ?? null;
}

function escapeQuery(s: string): string {
  return s.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, "\\$1");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
