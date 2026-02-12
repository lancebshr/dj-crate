/**
 * Standard key notation → Camelot wheel mapping.
 * Used for harmonic mixing — DJs match Camelot codes to blend tracks smoothly.
 */
const KEY_TO_CAMELOT: Record<string, string> = {
  // Major keys
  "B major": "1B",
  "F# major": "2B",
  "Gb major": "2B",
  "Db major": "3B",
  "C# major": "3B",
  "Ab major": "4B",
  "G# major": "4B",
  "Eb major": "5B",
  "D# major": "5B",
  "Bb major": "6B",
  "A# major": "6B",
  "F major": "7B",
  "C major": "8B",
  "G major": "9B",
  "D major": "10B",
  "A major": "11B",
  "E major": "12B",

  // Minor keys
  "Ab minor": "1A",
  "G# minor": "1A",
  "Eb minor": "2A",
  "D# minor": "2A",
  "Bb minor": "3A",
  "A# minor": "3A",
  "F minor": "4A",
  "C minor": "5A",
  "G minor": "6A",
  "D minor": "7A",
  "A minor": "8A",
  "E minor": "9A",
  "B minor": "10A",
  "F# minor": "11A",
  "Gb minor": "11A",
  "Db minor": "12A",
  "C# minor": "12A",
};

// Short notation variants (e.g., "C", "Cm", "C#m", "Db")
const SHORT_KEY_TO_CAMELOT: Record<string, string> = {
  // Major (just the note name)
  B: "1B",
  "F#": "2B",
  Gb: "2B",
  Db: "3B",
  "C#": "3B",
  Ab: "4B",
  "G#": "4B",
  Eb: "5B",
  "D#": "5B",
  Bb: "6B",
  "A#": "6B",
  F: "7B",
  C: "8B",
  G: "9B",
  D: "10B",
  A: "11B",
  E: "12B",

  // Minor (note + "m")
  Abm: "1A",
  "G#m": "1A",
  Ebm: "2A",
  "D#m": "2A",
  Bbm: "3A",
  "A#m": "3A",
  Fm: "4A",
  Cm: "5A",
  Gm: "6A",
  Dm: "7A",
  Am: "8A",
  Em: "9A",
  Bm: "10A",
  "F#m": "11A",
  Gbm: "11A",
  Dbm: "12A",
  "C#m": "12A",
};

/**
 * Convert any key notation to Camelot.
 * Handles: "C major", "Cm", "C minor", "8B", "8A", "C", etc.
 * Returns the input as-is if it's already Camelot notation or unrecognized.
 */
export function toCamelotKey(key: string | null | undefined): string | null {
  if (!key) return null;

  const trimmed = key.trim();

  // Already Camelot notation (e.g., "8B", "11A")
  if (/^\d{1,2}[AB]$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Try full notation first ("C major", "A minor")
  const fullMatch = KEY_TO_CAMELOT[trimmed];
  if (fullMatch) return fullMatch;

  // Try case-insensitive full notation
  const titleCase =
    trimmed.charAt(0).toUpperCase() +
    trimmed.slice(1).toLowerCase();
  const fullMatchInsensitive = KEY_TO_CAMELOT[titleCase];
  if (fullMatchInsensitive) return fullMatchInsensitive;

  // Try short notation ("C", "Cm", "F#m")
  const shortMatch = SHORT_KEY_TO_CAMELOT[trimmed];
  if (shortMatch) return shortMatch;

  // Try with "min"/"maj" suffix
  if (/min(or)?$/i.test(trimmed)) {
    const note = trimmed.replace(/\s*min(or)?$/i, "").trim();
    return SHORT_KEY_TO_CAMELOT[note + "m"] ?? null;
  }
  if (/maj(or)?$/i.test(trimmed)) {
    const note = trimmed.replace(/\s*maj(or)?$/i, "").trim();
    return SHORT_KEY_TO_CAMELOT[note] ?? null;
  }

  return null;
}
