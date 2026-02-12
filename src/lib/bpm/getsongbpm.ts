import type { BpmProvider, BpmLookupRequest, BpmResult } from "./types";
import { normalizeTitle, normalizeArtist } from "./normalize";
import { normalizeSimpleGenres } from "../genre-taxonomy";

const API_BASE = "https://api.getsongbpm.com";
const CONCURRENCY = 5;
const DELAY_BETWEEN_REQUESTS = 100;

export class GetSongBpmProvider implements BpmProvider {
  name = "getsongbpm";

  constructor(private apiKey: string) {}

  async lookupBatch(tracks: BpmLookupRequest[]): Promise<BpmResult[]> {
    const results: BpmResult[] = [];
    const queue = [...tracks];

    // Process with limited concurrency
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const track = queue.shift();
        if (!track) break;

        const result = await this.lookupSingle(track);
        results.push(result);

        if (queue.length > 0) {
          await sleep(DELAY_BETWEEN_REQUESTS);
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  private async lookupSingle(track: BpmLookupRequest): Promise<BpmResult> {
    const title = normalizeTitle(track.trackName);
    const artist = normalizeArtist(track.artistName);
    const lookup = `song:${title} artist:${artist}`;

    try {
      const searchUrl = `${API_BASE}/search/?api_key=${this.apiKey}&type=song&lookup=${encodeURIComponent(lookup)}`;
      const searchRes = await fetch(searchUrl);

      if (!searchRes.ok) {
        return this.emptyResult(track.trackId);
      }

      const searchData = await searchRes.json();
      const songs = searchData?.search;

      if (!songs || songs.length === 0) {
        return this.emptyResult(track.trackId);
      }

      // Use the first match
      const song = songs[0];
      const tempo = song.tempo ? parseFloat(song.tempo) : null;

      // Extract artist genres from the response (e.g. song.artist.genres)
      let genres: string[] | null = null;
      const rawGenres: unknown = song.artist?.genres;
      if (Array.isArray(rawGenres) && rawGenres.length > 0) {
        const normalized = normalizeSimpleGenres(rawGenres as string[]);
        if (normalized.length > 0) {
          genres = normalized;
        }
      }

      return {
        trackId: track.trackId,
        bpm: tempo && tempo > 0 ? tempo : null,
        musicalKey: song.key_of || null,
        camelotKey: song.open_key || null,
        source: this.name,
        genres,
      };
    } catch {
      return this.emptyResult(track.trackId);
    }
  }

  private emptyResult(trackId: string): BpmResult {
    return {
      trackId,
      bpm: null,
      musicalKey: null,
      camelotKey: null,
      source: this.name,
    };
  }
}

/**
 * Genre-only lookup via GetSongBPM (no BPM needed).
 * Used by /api/genres when BPM already comes from CSV.
 */
export async function lookupGenresViaSongBpm(
  tracks: Array<{ trackId: string; trackName: string; artistName: string }>,
  apiKey: string
): Promise<Array<{ trackId: string; genres: string[] }>> {
  const results: Array<{ trackId: string; genres: string[] }> = [];
  const queue = [...tracks];

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const track = queue.shift();
      if (!track) break;

      const title = normalizeTitle(track.trackName);
      const artist = normalizeArtist(track.artistName);
      const lookup = `song:${title} artist:${artist}`;

      try {
        const url = `${API_BASE}/search/?api_key=${apiKey}&type=song&lookup=${encodeURIComponent(lookup)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const song = data?.search?.[0];
          const rawGenres: unknown = song?.artist?.genres;
          if (Array.isArray(rawGenres) && rawGenres.length > 0) {
            const normalized = normalizeSimpleGenres(rawGenres as string[]);
            if (normalized.length > 0) {
              results.push({ trackId: track.trackId, genres: normalized });
            }
          }
        }
      } catch {
        // skip
      }

      if (queue.length > 0) await sleep(DELAY_BETWEEN_REQUESTS);
    }
  });

  await Promise.all(workers);
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
