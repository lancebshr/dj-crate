import type { BpmProvider, BpmLookupRequest, BpmResult } from "./types";
import { GetSongBpmProvider } from "./getsongbpm";
import { SoundNetProvider } from "./soundnet";

// In-memory cache keyed by "artist:title" (lowercased)
const cache = new Map<string, BpmResult>();

function cacheKey(artistName: string, trackName: string): string {
  return `${artistName.toLowerCase()}:${trackName.toLowerCase()}`;
}

export function createBpmProviderChain(): {
  lookup: (tracks: BpmLookupRequest[]) => Promise<BpmResult[]>;
} {
  const providers: BpmProvider[] = [];

  if (process.env.GETSONGBPM_API_KEY) {
    providers.push(new GetSongBpmProvider(process.env.GETSONGBPM_API_KEY));
  }

  if (process.env.RAPIDAPI_KEY) {
    providers.push(new SoundNetProvider(process.env.RAPIDAPI_KEY));
  }

  if (providers.length === 0) {
    throw new Error("No BPM provider configured. Set GETSONGBPM_API_KEY or RAPIDAPI_KEY.");
  }

  return {
    async lookup(tracks: BpmLookupRequest[]): Promise<BpmResult[]> {
      const results: BpmResult[] = [];
      let remaining = [...tracks];

      // Check cache first
      const uncached: BpmLookupRequest[] = [];
      for (const track of remaining) {
        const key = cacheKey(track.artistName, track.trackName);
        const cached = cache.get(key);
        if (cached) {
          results.push({ ...cached, trackId: track.trackId });
        } else {
          uncached.push(track);
        }
      }

      remaining = uncached;

      // Try each provider in order
      for (const provider of providers) {
        if (remaining.length === 0) break;

        const providerResults = await provider.lookupBatch(remaining);
        const nextRemaining: BpmLookupRequest[] = [];

        for (const result of providerResults) {
          if (result.bpm !== null) {
            // Cache the hit
            const track = remaining.find((t) => t.trackId === result.trackId);
            if (track) {
              cache.set(cacheKey(track.artistName, track.trackName), result);
            }
            results.push(result);
          } else {
            // Keep for next provider
            const track = remaining.find((t) => t.trackId === result.trackId);
            if (track) {
              nextRemaining.push(track);
            }
          }
        }

        remaining = nextRemaining;
      }

      // Any remaining tracks got no results from any provider
      for (const track of remaining) {
        results.push({
          trackId: track.trackId,
          bpm: null,
          musicalKey: null,
          camelotKey: null,
          source: "none",
        });
      }

      return results;
    },
  };
}
