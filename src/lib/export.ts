import type { TrackWithBpm } from "@/types";

/**
 * Download filtered tracks as a CSV file.
 * Includes Spotify URIs for accurate matching in Soundiiz/TuneMyMusic.
 */
export function downloadCsv(tracks: TrackWithBpm[], filename = "dj-crate-export.csv") {
  const header = "Track Name,Artist,Album,BPM,Key,Camelot Key,Genres,Vibe,Spotify URI";
  const rows = tracks.map((t) => {
    const fields = [
      csvEscape(t.name),
      csvEscape(t.artist),
      csvEscape(t.album),
      t.bpm !== null ? Math.round(t.bpm).toString() : "",
      t.musicalKey ?? "",
      t.camelotKey ?? "",
      csvEscape(t.genres?.join("; ") ?? ""),
      t.vibe ?? "",
      t.spotifyUri ?? "",
    ];
    return fields.join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy tracks as a simple text list for pasting into TuneMyMusic.
 * Format: "Artist - Track Name" (one per line) — TuneMyMusic's preferred format.
 */
export function copyAsText(tracks: TrackWithBpm[]): string {
  return tracks.map((t) => `${t.artist} - ${t.name}`).join("\n");
}

/**
 * Build a Beatport search URL for a track.
 */
export function beatportSearchUrl(track: { name: string; artist: string }): string {
  const query = `${track.artist} ${track.name}`;
  return `https://www.beatport.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Build a SoundCloud search URL for a track.
 */
export function soundcloudSearchUrl(track: { name: string; artist: string }): string {
  const query = `${track.artist} ${track.name}`;
  return `https://soundcloud.com/search/sounds?q=${encodeURIComponent(query)}`;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
