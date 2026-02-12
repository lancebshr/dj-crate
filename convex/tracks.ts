import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Look up cached track data by normalized artist:title key
export const getBatch = query({
  args: {
    lookupKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<
      string,
      {
        bpm: number | undefined;
        musicalKey: string | undefined;
        camelotKey: string | undefined;
        genres: string[] | undefined;
        bpmSource: string | undefined;
      }
    > = {};

    for (const key of args.lookupKeys) {
      const cached = await ctx.db
        .query("trackCache")
        .withIndex("by_lookup_key", (q) => q.eq("lookupKey", key))
        .first();

      if (cached) {
        results[key] = {
          bpm: cached.bpm,
          musicalKey: cached.musicalKey,
          camelotKey: cached.camelotKey,
          genres: cached.genres,
          bpmSource: cached.bpmSource,
        };
      }
    }

    return results;
  },
});

// Upsert track data into the cache
export const upsertBatch = mutation({
  args: {
    tracks: v.array(
      v.object({
        lookupKey: v.string(),
        trackName: v.string(),
        artistName: v.string(),
        bpm: v.optional(v.float64()),
        musicalKey: v.optional(v.string()),
        camelotKey: v.optional(v.string()),
        genres: v.optional(v.array(v.string())),
        bpmSource: v.optional(v.string()),
        genreSource: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const track of args.tracks) {
      const existing = await ctx.db
        .query("trackCache")
        .withIndex("by_lookup_key", (q) => q.eq("lookupKey", track.lookupKey))
        .first();

      if (existing) {
        // Merge: only overwrite fields that have new data
        await ctx.db.patch(existing._id, {
          ...track,
          bpm: track.bpm ?? existing.bpm,
          musicalKey: track.musicalKey ?? existing.musicalKey,
          camelotKey: track.camelotKey ?? existing.camelotKey,
          genres: track.genres ?? existing.genres,
          bpmSource: track.bpmSource ?? existing.bpmSource,
          genreSource: track.genreSource ?? existing.genreSource,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("trackCache", {
          ...track,
          updatedAt: Date.now(),
        });
      }
    }
  },
});
