import type { BpmProvider, BpmLookupRequest, BpmResult } from "./types";
import { normalizeTitle, normalizeArtist } from "./normalize";

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

      return {
        trackId: track.trackId,
        bpm: tempo && tempo > 0 ? tempo : null,
        musicalKey: song.key_of || null,
        camelotKey: song.open_key || null,
        source: this.name,
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
