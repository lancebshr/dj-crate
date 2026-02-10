import type { SpotifySavedTrack, SpotifyPlaylistTrack } from "./spotify/types";
import type { Track, Playlist } from "@/types";
import type { SpotifyPlaylist } from "./spotify/types";

export function savedTrackToTrack(saved: SpotifySavedTrack): Track {
  const t = saved.track;
  return {
    id: t.id,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    albumArt: t.album.images[0]?.url ?? null,
    durationMs: t.duration_ms,
    spotifyUri: t.uri,
  };
}

export function playlistTrackToTrack(
  pt: SpotifyPlaylistTrack
): Track | null {
  if (!pt.track) return null;
  const t = pt.track;
  return {
    id: t.id,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    albumArt: t.album.images[0]?.url ?? null,
    durationMs: t.duration_ms,
    spotifyUri: t.uri,
  };
}

export function spotifyPlaylistToPlaylist(sp: SpotifyPlaylist): Playlist {
  return {
    id: sp.id,
    name: sp.name,
    description: sp.description,
    imageUrl: sp.images[0]?.url ?? null,
    trackCount: sp.tracks.total,
    ownerName: sp.owner.display_name,
  };
}

export function deduplicateTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}
