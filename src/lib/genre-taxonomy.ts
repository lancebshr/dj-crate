// Curated mapping from raw MusicBrainz tags → canonical DJ genres
const TAG_MAP: Record<string, string> = {
  // House
  house: "house",
  "house music": "house",
  "deep house": "deep house",
  "deep-house": "deep house",
  "tech house": "tech house",
  "tech-house": "tech house",
  "progressive house": "house",
  "acid house": "house",
  "funky house": "house",
  "electro house": "house",
  "minimal house": "house",

  // Techno
  techno: "techno",
  "minimal techno": "techno",
  "detroit techno": "techno",
  "acid techno": "techno",
  "industrial techno": "techno",
  "hard techno": "techno",
  "dub techno": "techno",

  // Trance
  trance: "trance",
  "progressive trance": "trance",
  psytrance: "trance",
  "psy-trance": "trance",
  "uplifting trance": "trance",
  "vocal trance": "trance",

  // Drum and bass
  "drum and bass": "drum and bass",
  "drum & bass": "drum and bass",
  dnb: "drum and bass",
  "d&b": "drum and bass",
  "liquid funk": "drum and bass",
  jungle: "drum and bass",

  // Dubstep
  dubstep: "dubstep",
  brostep: "dubstep",
  riddim: "dubstep",

  // Hip hop
  "hip hop": "hip hop",
  "hip-hop": "hip hop",
  rap: "hip hop",
  "gangsta rap": "hip hop",
  trap: "hip hop",
  grime: "hip hop",

  // R&B
  "r&b": "r&b",
  rnb: "r&b",
  "rhythm and blues": "r&b",
  "neo-soul": "r&b",
  "neo soul": "r&b",

  // Pop
  pop: "pop",
  "synth-pop": "pop",
  synthpop: "pop",
  "electropop": "pop",
  "dance-pop": "pop",
  "indie pop": "pop",
  "dream pop": "pop",
  "art pop": "pop",
  "k-pop": "pop",

  // Rock
  rock: "rock",
  "alternative rock": "rock",
  "indie rock": "rock",
  "punk rock": "rock",
  "post-punk": "rock",
  "classic rock": "rock",
  "hard rock": "rock",
  metal: "rock",
  "heavy metal": "rock",
  grunge: "rock",

  // Indie
  indie: "indie",
  "lo-fi": "indie",
  "lofi": "indie",
  "bedroom pop": "indie",
  shoegaze: "indie",

  // Electronic (broad)
  electronic: "electronic",
  electronica: "electronic",
  edm: "electronic",
  idm: "electronic",
  breakbeat: "electronic",
  "uk garage": "electronic",
  garage: "electronic",
  "2-step": "electronic",
  "future bass": "electronic",

  // Disco
  disco: "disco",
  "nu-disco": "disco",
  "nu disco": "disco",
  "italo disco": "disco",

  // Funk
  funk: "funk",
  "p-funk": "funk",
  "electro-funk": "funk",

  // Soul
  soul: "soul",
  motown: "soul",

  // Reggae
  reggae: "reggae",
  dub: "reggae",
  ska: "reggae",
  roots: "reggae",

  // Dancehall
  dancehall: "dancehall",
  ragga: "dancehall",
  soca: "dancehall",

  // Latin
  latin: "latin",
  reggaeton: "latin",
  "latin pop": "latin",
  salsa: "latin",
  bachata: "latin",
  cumbia: "latin",
  dembow: "latin",
  "bossa nova": "latin",

  // Ambient
  ambient: "ambient",
  "dark ambient": "ambient",
  downtempo: "ambient",
  chillout: "ambient",
  "chill out": "ambient",
  "new age": "ambient",
};

// Tags that are not genres (noise filtering)
const NOISE_TAGS = new Set([
  "seen live",
  "favorites",
  "favourite",
  "favorite",
  "loved",
  "spotify",
  "beautiful",
  "awesome",
  "cool",
  "catchy",
  "chill",
  "party",
  "summer",
  "good",
  "great",
  "classic",
  "best",
  "under 2000 listeners",
  "male vocalists",
  "female vocalists",
  "singer-songwriter",
  "all",
  "albums i own",
  "check out",
  "my favorite",
]);

function isNoise(tag: string): boolean {
  const lower = tag.toLowerCase();
  if (NOISE_TAGS.has(lower)) return true;
  // Filter year tags (e.g. "2019", "1990s", "00s", "80s")
  if (/^\d{4}$/.test(lower)) return true;
  if (/^\d{2}s$/.test(lower)) return true;
  if (/^\d{4}s$/.test(lower)) return true;
  return false;
}

export interface RawTag {
  name: string;
  count: number;
}

/**
 * Normalize plain genre strings (e.g. from GetSongBPM artist.genres).
 * No weighting — just map through TAG_MAP and dedupe.
 */
export function normalizeSimpleGenres(genres: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const genre of genres) {
    const lower = genre.toLowerCase().trim();
    if (isNoise(lower)) continue;

    const canonical = TAG_MAP[lower];
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    } else if (!canonical && !seen.has(lower)) {
      seen.add(lower);
      result.push(lower);
    }

    if (result.length >= 3) break;
  }

  return result;
}

export function normalizeGenreTags(rawTags: RawTag[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of rawTags) {
    const lower = tag.name.toLowerCase().trim();
    if (isNoise(lower)) continue;

    const canonical = TAG_MAP[lower];
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    } else if (!canonical && tag.count >= 1 && !seen.has(lower)) {
      // Unmapped tags with decent count pass through
      seen.add(lower);
      result.push(lower);
    }

    if (result.length >= 3) break;
  }

  return result;
}
