/**
 * Derives a single vibe tag from BPM + genre context.
 * Called client-side — no API call.
 */
export function deriveVibe(
  genres: string[] | null,
  bpm: number | null
): string | null {
  const g = new Set(genres ?? []);

  // Genre-specific rules
  if (g.has("techno") && bpm !== null && bpm >= 138) return "aggressive";
  if (g.has("techno") && bpm !== null && bpm >= 125) return "dark";
  if (
    (g.has("house") || g.has("deep house")) &&
    bpm !== null &&
    bpm >= 118 &&
    bpm <= 128
  )
    return "groovy";
  if (g.has("trance")) return "melodic";
  if (g.has("drum and bass")) return "high energy";
  if (
    (g.has("hip hop") || g.has("r&b")) &&
    bpm !== null &&
    bpm < 100
  )
    return "chill";
  if (g.has("ambient")) return "chill";

  // BPM-only fallbacks
  if (bpm !== null && bpm >= 160) return "high energy";
  if (bpm !== null && bpm >= 140) return "high energy";
  if (bpm !== null && bpm < 95) return "chill";

  return null;
}
