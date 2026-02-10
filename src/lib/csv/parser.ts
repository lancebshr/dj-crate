import type { Track } from "@/types";

interface CsvParseResult {
  tracks: Track[];
  hasBpmData: boolean;
  bpmMap: Map<string, number>; // trackId -> bpm from CSV
  errors: string[];
}

// Known column name mappings (case-insensitive)
const TRACK_NAME_COLS = ["track name", "name", "title", "song", "song name"];
const ARTIST_COLS = [
  "artist name(s)",
  "artist name",
  "artist",
  "artists",
  "artist(s)",
];
const ALBUM_COLS = ["album name", "album", "album title"];
const BPM_COLS = ["tempo", "bpm", "beats per minute"];
const DURATION_COLS = ["duration (ms)", "duration_ms", "duration"];
const URI_COLS = ["spotify uri", "uri", "track uri"];
const ID_COLS = ["spotify id", "track id", "id"];
const IMAGE_COLS = ["album image url", "image", "album art", "artwork"];

export function parseCsv(csvText: string): CsvParseResult {
  const errors: string[] = [];
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return { tracks: [], hasBpmData: false, bpmMap: new Map(), errors: ["CSV file is empty or has no data rows."] };
  }

  const headerLine = lines[0];
  const headers = parseRow(headerLine).map((h) => h.toLowerCase().trim());

  // Find column indices
  const nameIdx = findColumnIndex(headers, TRACK_NAME_COLS);
  const artistIdx = findColumnIndex(headers, ARTIST_COLS);
  const albumIdx = findColumnIndex(headers, ALBUM_COLS);
  const bpmIdx = findColumnIndex(headers, BPM_COLS);
  const durationIdx = findColumnIndex(headers, DURATION_COLS);
  const uriIdx = findColumnIndex(headers, URI_COLS);
  const idIdx = findColumnIndex(headers, ID_COLS);
  const imageIdx = findColumnIndex(headers, IMAGE_COLS);

  if (nameIdx === -1) {
    errors.push(
      `Could not find a track name column. Expected one of: ${TRACK_NAME_COLS.join(", ")}`
    );
    return { tracks: [], hasBpmData: false, bpmMap: new Map(), errors };
  }

  if (artistIdx === -1) {
    errors.push(
      `Could not find an artist column. Expected one of: ${ARTIST_COLS.join(", ")}`
    );
    return { tracks: [], hasBpmData: false, bpmMap: new Map(), errors };
  }

  const tracks: Track[] = [];
  const bpmMap = new Map<string, number>();
  let hasBpmData = false;

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.length === 0) continue;

    const name = values[nameIdx]?.trim();
    const artist = values[artistIdx]?.trim();

    if (!name || !artist) continue;

    // Generate a stable ID from the track data
    const id =
      idIdx !== -1 && values[idIdx]?.trim()
        ? values[idIdx].trim()
        : `csv-${i}-${hashString(`${artist}:${name}`)}`;

    const track: Track = {
      id,
      name,
      artist,
      album: albumIdx !== -1 ? values[albumIdx]?.trim() || "" : "",
      albumArt: imageIdx !== -1 ? values[imageIdx]?.trim() || null : null,
      durationMs:
        durationIdx !== -1 ? parseInt(values[durationIdx]) || 0 : 0,
      spotifyUri: uriIdx !== -1 ? values[uriIdx]?.trim() || "" : "",
    };

    tracks.push(track);

    // Extract BPM if available
    if (bpmIdx !== -1) {
      const bpmVal = parseFloat(values[bpmIdx]);
      if (!isNaN(bpmVal) && bpmVal > 0) {
        hasBpmData = true;
        bpmMap.set(id, bpmVal);
      }
    }
  }

  if (tracks.length === 0) {
    errors.push("No valid tracks found in the CSV.");
  }

  return { tracks, hasBpmData, bpmMap, errors };
}

// Parse a CSV row, handling quoted fields with commas
function parseRow(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
