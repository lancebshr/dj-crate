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

    // Look up genres for uncached tracks
    if (uncachedTracks.length > 0) {
      // Layer 1: GetSongBPM (fast, concurrent)
      let layer1Hits = new Set<string>();
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

      // Write all new genres back to Convex cache
      if (convex) {
        const allNewGenres = results.filter(
          (r) =>
            r.genres.length > 0 &&
            uncachedTracks.some((t) => t.trackId === r.trackId)
        );
        const toCache = allNewGenres.map((g) => {
          const track = uncachedTracks.find(
            (t) => t.trackId === g.trackId
          )!;
          const source = layer1Hits.has(g.trackId)
            ? "getsongbpm"
            : "musicbrainz";
          return {
            lookupKey: lookupKey(track.artistName, track.trackName),
            trackName: normalizeTitle(track.trackName),
            artistName: normalizeArtist(track.artistName),
            genres: g.genres,
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
