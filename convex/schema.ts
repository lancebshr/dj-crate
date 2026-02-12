import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Cache for track metadata (BPM, key, genre)
  // Keyed by normalized "artist:title" so any user benefits from prior lookups
  trackCache: defineTable({
    lookupKey: v.string(), // lowercase "artist:title"
    trackName: v.string(),
    artistName: v.string(),
    bpm: v.optional(v.float64()),
    musicalKey: v.optional(v.string()),
    camelotKey: v.optional(v.string()),
    genres: v.optional(v.array(v.string())),
    bpmSource: v.optional(v.string()),
    genreSource: v.optional(v.string()),
    updatedAt: v.float64(),
  }).index("by_lookup_key", ["lookupKey"]),
});
