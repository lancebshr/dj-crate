import { NextResponse } from "next/server";
import { lookupGenresViaLastFm } from "@/lib/lastfm";
import { lookupGenres } from "@/lib/musicbrainz";
import { normalizeTitle, normalizeArtist } from "@/lib/bpm/normalize";
import { getConvexClient, api } from "@/lib/convex-client";

const LASTFM_KEY = process.env.LASTFM_API_KEY || "";

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

    // Check Convex cache
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

    if (uncachedTracks.length > 0) {
      const taggedIds = new Set<string>();

      // Layer 1: Last.fm (fast, concurrent, great coverage)
      if (LASTFM_KEY) {
        try {
          const lfmResults = await lookupGenresViaLastFm(
            uncachedTracks,
            LASTFM_KEY
          );
          for (const gr of lfmResults) {
            results.push(gr);
            taggedIds.add(gr.trackId);
          }
        } catch (err) {
          console.error("Last.fm genre lookup failed:", err);
        }
      }

      // Layer 2: MusicBrainz for Last.fm misses (slower, 1 req/sec)
      const stillNeeded = uncachedTracks.filter(
        (t) => !taggedIds.has(t.trackId)
      );
      if (stillNeeded.length > 0) {
        try {
          const mbResults = await lookupGenres(stillNeeded);
          for (const gr of mbResults) {
            if (gr.genres.length > 0) {
              results.push(gr);
              taggedIds.add(gr.trackId);
            }
          }
        } catch (err) {
          console.error("MusicBrainz genre lookup failed:", err);
        }
      }

      // Cache tracks that got genres
      if (convex) {
        const toCache = uncachedTracks
          .filter((t) => taggedIds.has(t.trackId))
          .map((track) => {
            const found = results.find((r) => r.trackId === track.trackId);
            return {
              lookupKey: lookupKey(track.artistName, track.trackName),
              trackName: normalizeTitle(track.trackName),
              artistName: normalizeArtist(track.artistName),
              genres: found?.genres ?? [],
              genreSource: "lastfm",
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
