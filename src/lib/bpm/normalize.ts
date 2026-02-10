// Strip common Spotify suffixes to improve BPM lookup match rates
const PATTERNS_TO_STRIP = [
  /\s*\(feat\.[^)]*\)/gi,
  /\s*\(ft\.[^)]*\)/gi,
  /\s*feat\.\s*.*/gi,
  /\s*ft\.\s*.*/gi,
  /\s*\(with\s+[^)]*\)/gi,
  /\s*-\s*remaster(ed)?\s*(\d{4})?\s*/gi,
  /\s*\(remaster(ed)?\s*(\d{4})?\)/gi,
  /\s*\(deluxe\s*(edition)?\)/gi,
  /\s*\(bonus\s*track\s*(version)?\)/gi,
  /\s*\(expanded\s*edition\)/gi,
  /\s*\(anniversary\s*edition\)/gi,
  /\s*\(live\)/gi,
  /\s*\(acoustic\)/gi,
  /\s*\(radio\s*edit\)/gi,
  /\s*\(single\s*version\)/gi,
  /\s*\(original\s*mix\)/gi,
  /\s*\[.*?\]/g,
];

export function normalizeTitle(title: string): string {
  let normalized = title;
  for (const pattern of PATTERNS_TO_STRIP) {
    normalized = normalized.replace(pattern, "");
  }
  return normalized.trim();
}

export function normalizeArtist(artist: string): string {
  // Take just the first artist if comma-separated
  return artist.split(",")[0].trim();
}
