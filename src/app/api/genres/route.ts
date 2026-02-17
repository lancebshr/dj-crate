import { NextResponse } from "next/server";
import { lookupGenres } from "@/lib/musicbrainz";
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

    if (tracks.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 tracks per request" },
        { status: 400 }
      );
    }

    // Check Convex cache for existing genres
    const convex = getConvexClient();
    const results: Array<{ trackId: string; genres: string[] }> = [];
    let uncachedTracks = [...tracks];

    if (convex) {
      try {
        const keys = tracks.map((t) => lookupKey(t.artistName, t.trackName));
        const cached = await convex.query(api.tracks.getBatch, {
          lookupKeys: keys,
        });

        const stillNeeded: typeof tracks = [];
        for (let i = 0; i < tracks.length; i++) {
          const hit = cached[keys[i]];
          if (hit?.genres && hit.genres.length > 0) {
            results.push({ trackId: tracks[i].trackId, genres: hit.genres });
          } else {
            stillNeeded.push(tracks[i]);
          }
        }
        uncachedTracks = stillNeeded;
      } catch (err) {
        console.error("Convex genre cache read failed:", err);
      }
    }

    // Look up genres via MusicBrainz for uncached tracks
    if (uncachedTracks.length > 0) {
      const mbResults = await lookupGenres(uncachedTracks);
      for (const gr of mbResults) {
        results.push(gr);
      }

      // Cache tracks that got genres to Convex
      if (convex) {
        const toCache = mbResults
          .filter((r) => r.genres.length > 0)
          .map((r) => {
            const track = uncachedTracks.find((t) => t.trackId === r.trackId)!;
            return {
              lookupKey: lookupKey(track.artistName, track.trackName),
              trackName: normalizeTitle(track.trackName),
              artistName: normalizeArtist(track.artistName),
              genres: r.genres,
              genreSource: "musicbrainz",
            };
          });

        if (toCache.length > 0) {
          convex
            .mutation(api.tracks.upsertBatch, { tracks: toCache })
            .catch((err: unknown) =>
              console.error("Convex genre cache write failed:", err)
            );
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Genre lookup error:", err);
    return NextResponse.json(
      { error: "Genre lookup failed" },
      { status: 500 }
    );
  }
}
