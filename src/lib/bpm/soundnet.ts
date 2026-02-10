import type { BpmProvider, BpmLookupRequest, BpmResult } from "./types";
import { normalizeTitle, normalizeArtist } from "./normalize";

const API_BASE = "https://track-analysis.p.rapidapi.com";
const CONCURRENCY = 3;
const DELAY_BETWEEN_REQUESTS = 200;

export class SoundNetProvider implements BpmProvider {
  name = "soundnet";

  constructor(private rapidApiKey: string) {}

  async lookupBatch(tracks: BpmLookupRequest[]): Promise<BpmResult[]> {
    const results: BpmResult[] = [];
    const queue = [...tracks];

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

    try {
      const url = `${API_BASE}/search?query=${encodeURIComponent(`${artist} ${title}`)}`;
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": this.rapidApiKey,
          "X-RapidAPI-Host": "track-analysis.p.rapidapi.com",
        },
      });

      if (!res.ok) {
        return this.emptyResult(track.trackId);
      }

      const data = await res.json();

      // The API may return an array of results or a single object
      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        return this.emptyResult(track.trackId);
      }

      return {
        trackId: track.trackId,
        bpm: result.tempo ?? result.bpm ?? null,
        musicalKey: result.key ?? null,
        camelotKey: result.camelot ?? result.camelot_key ?? null,
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
