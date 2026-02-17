import { NextResponse } from "next/server";
import { normalizeTitle, normalizeArtist } from "@/lib/bpm/normalize";
import { getConvexClient, api } from "@/lib/convex-client";

/** Strip non-ASCII so Convex field names don't crash on characters like ö */
function toAscii(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
}

function lookupKey(artistName: string, trackName: string): string {
  return toAscii(
    `${normalizeArtist(artistName).toLowerCase()}:${normalizeTitle(trackName).toLowerCase()}`
  );
}

const CONVEX_BATCH_SIZE = 100;

/**
 * Bulk Convex-only genre cache lookup.
 * Returns cached genres without calling any external API.
 * Used to pre-populate genre data on page load before enriching uncached tracks.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tracks: Array<{
      trackId: string;
      trackName: string;
      artistName: string;
    }> = body.tracks;

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json(
        { error: "tracks array is required" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json({ results: [], uncachedTrackIds: tracks.map(t => t.trackId) });
    }

    const results: Array<{ trackId: string; genres: string[] }> = [];
    const uncachedTrackIds: string[] = [];

    // Process in batches to avoid overloading Convex query
    for (let i = 0; i < tracks.length; i += CONVEX_BATCH_SIZE) {
      const batch = tracks.slice(i, i + CONVEX_BATCH_SIZE);
      const keys = batch.map((t) => lookupKey(t.artistName, t.trackName));

      try {
        const cached = await convex.query(api.tracks.getBatch, {
          lookupKeys: keys,
        });

        for (let j = 0; j < batch.length; j++) {
          const hit = cached[keys[j]];
          if (hit?.genres && hit.genres.length > 0) {
            results.push({ trackId: batch[j].trackId, genres: hit.genres });
          } else {
            uncachedTrackIds.push(batch[j].trackId);
          }
        }
      } catch (err) {
        console.error("Convex genre cache batch read failed:", err);
        // Mark whole batch as uncached
        for (const t of batch) {
          uncachedTrackIds.push(t.trackId);
        }
      }
    }

    return NextResponse.json({ results, uncachedTrackIds });
  } catch (err) {
    console.error("Genre cache lookup error:", err);
    return NextResponse.json(
      { error: "Genre cache lookup failed" },
      { status: 500 }
    );
  }
}
