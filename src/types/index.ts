export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
  spotifyUri: string;
}

export interface TrackWithBpm extends Track {
  bpm: number | null;
  musicalKey: string | null;
  camelotKey: string | null;
  bpmSource: string | null;
  bpmLoading: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  trackCount: number;
  ownerName: string | null;
}

export type LibrarySource =
  | { type: "liked" }
  | { type: "playlist"; playlistId: string; playlistName: string };
