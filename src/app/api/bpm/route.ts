import { NextResponse } from "next/server";
import { createBpmProviderChain } from "@/lib/bpm/provider";
import { normalizeTitle, normalizeArtist } from "@/lib/bpm/normalize";
import { toCamelotKey } from "@/lib/camelot";
import { getConvexClient, api } from "@/lib/convex-client";
import type { BpmLookupRequest, BpmResult } from "@/lib/bpm/types";

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
    const tracks: BpmLookupRequest[] = body.tracks;

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

    // Step 1: Check Convex cache
    const convex = getConvexClient();
    const results: BpmResult[] = [];
    let uncachedTracks: BpmLookupRequest[] = [...tracks];

    if (convex) {
      try {
        const keys = tracks.map((t) => lookupKey(t.artistName, t.trackName));
        const cached = await convex.query(api.tracks.getBatch, {
          lookupKeys: keys,
        });

        const stillNeeded: BpmLookupRequest[] = [];
        for (let i = 0; i < tracks.length; i++) {
          const key = keys[i];
          const hit = cached[key];
          if (hit && hit.bpm !== undefined) {
            results.push({
              trackId: tracks[i].trackId,
              bpm: hit.bpm ?? null,
              musicalKey: hit.musicalKey ?? null,
              camelotKey: hit.camelotKey ?? null,
              source: hit.bpmSource ?? "cache",
              genres: hit.genres ?? null,
            });
          } else {
            stillNeeded.push(tracks[i]);
          }
        }
        uncachedTracks = stillNeeded;
      } catch (err) {
        console.error("Convex cache read failed, falling through:", err);
      }
    }

    // Step 2: Look up remaining tracks via BPM providers
    if (uncachedTracks.length > 0) {
      const chain = createBpmProviderChain();
      const providerResults = await chain.lookup(uncachedTracks);

      // Normalize Camelot keys on all results
      for (const result of providerResults) {
        if (result.musicalKey && !result.camelotKey) {
          result.camelotKey = toCamelotKey(result.musicalKey);
        } else if (result.camelotKey) {
          result.camelotKey = toCamelotKey(result.camelotKey);
        }
        results.push(result);
      }

      // Step 3: Write new results back to Convex cache
      if (convex) {
        const toCache = providerResults
          .filter((r) => r.bpm !== null)
          .map((r) => {
            const track = uncachedTracks.find((t) => t.trackId === r.trackId)!;
            return {
              lookupKey: lookupKey(track.artistName, track.trackName),
              trackName: normalizeTitle(track.trackName),
              artistName: normalizeArtist(track.artistName),
              ...(r.bpm !== null ? { bpm: r.bpm } : {}),
              ...(r.musicalKey ? { musicalKey: r.musicalKey } : {}),
              ...(r.camelotKey ? { camelotKey: r.camelotKey } : {}),
              bpmSource: r.source,
              ...(r.genres && r.genres.length > 0
                ? { genres: r.genres, genreSource: "getsongbpm" }
                : {}),
            };
          });

        if (toCache.length > 0) {
          convex
            .mutation(api.tracks.upsertBatch, { tracks: toCache })
            .catch((err: unknown) =>
              console.error("Convex cache write failed:", err)
            );
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("BPM lookup error:", err);
    return NextResponse.json(
      { error: "BPM lookup failed" },
      { status: 500 }
    );
  }
}
