import { NextResponse } from "next/server";
import { lookupGenres } from "@/lib/musicbrainz";
import { lookupGenresViaSongBpm } from "@/lib/bpm/getsongbpm";
import { normalizeTitle, normalizeArtist } from "@/lib/bpm/normalize";
import { getConvexClient, api } from "@/lib/convex-client";

const GETSONGBPM_KEY = process.env.GETSONGBPM_API_KEY || "";

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
            // Cached with genres — use them
            results.push({ trackId: tracks[i].trackId, genres: hit.genres });
          } else if (hit?.genreSource) {
            // Was looked up before but returned no genres — don't retry
            results.push({ trackId: tracks[i].trackId, genres: [] });
          } else {
            stillNeeded.push(tracks[i]);
          }
        }
        uncachedTracks = stillNeeded;
      } catch (err) {
        console.error("Convex genre cache read failed:", err);
      }
    }

    // Look up genres for uncached tracks
    if (uncachedTracks.length > 0) {
      // Layer 1: GetSongBPM (fast, concurrent)
      const layer1Hits = new Set<string>();
      if (GETSONGBPM_KEY) {
        try {
          const gsbResults = await lookupGenresViaSongBpm(
            uncachedTracks,
            GETSONGBPM_KEY
          );
          for (const gr of gsbResults) {
            results.push(gr);
            layer1Hits.add(gr.trackId);
          }
        } catch (err) {
          console.error("GetSongBPM genre lookup failed:", err);
        }
      }

      // Layer 2: MusicBrainz for anything Layer 1 missed
      const stillNeeded = uncachedTracks.filter(
        (t) => !layer1Hits.has(t.trackId)
      );
      if (stillNeeded.length > 0) {
        const mbResults = await lookupGenres(stillNeeded);
        for (const gr of mbResults) {
          results.push(gr);
        }
      }

      // Build a set of trackIds that got genres from APIs
      const lookedUpIds = new Set(uncachedTracks.map((t) => t.trackId));
      const resultMap = new Map<string, string[]>();
      for (const r of results) {
        if (lookedUpIds.has(r.trackId)) {
          resultMap.set(r.trackId, r.genres);
        }
      }

      // Write ALL looked-up tracks to Convex — including empty genres
      // so we don't re-lookup tracks that genuinely have no genre data
      if (convex) {
        const toCache = uncachedTracks.map((track) => {
          const genres = resultMap.get(track.trackId) ?? [];
          const source = layer1Hits.has(track.trackId)
            ? "getsongbpm"
            : "musicbrainz";
          return {
            lookupKey: lookupKey(track.artistName, track.trackName),
            trackName: normalizeTitle(track.trackName),
            artistName: normalizeArtist(track.artistName),
            genres,
            genreSource: source,
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
