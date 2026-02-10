"use client";

import { useState, useCallback } from "react";
import { SpotifyClient } from "@/lib/spotify/client";
import {
  savedTrackToTrack,
  playlistTrackToTrack,
  spotifyPlaylistToPlaylist,
  deduplicateTracks,
} from "@/lib/utils";
import type { Track, Playlist, LibrarySource } from "@/types";

interface LibraryState {
  tracks: Track[];
  playlists: Playlist[];
  selectedSource: LibrarySource | null;
  isLoadingPlaylists: boolean;
  isLoadingTracks: boolean;
  loadProgress: { loaded: number; total: number } | null;
  error: string | null;
}

export function useLibrary(accessToken: string | null) {
  const [state, setState] = useState<LibraryState>({
    tracks: [],
    playlists: [],
    selectedSource: null,
    isLoadingPlaylists: false,
    isLoadingTracks: false,
    loadProgress: null,
    error: null,
  });

  const fetchPlaylists = useCallback(async () => {
    if (!accessToken) return;

    setState((s) => ({ ...s, isLoadingPlaylists: true, error: null }));

    try {
      const client = new SpotifyClient(accessToken);
      const spotifyPlaylists = await client.getPlaylists();
      const playlists = spotifyPlaylists.map(spotifyPlaylistToPlaylist);
      setState((s) => ({ ...s, playlists, isLoadingPlaylists: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoadingPlaylists: false,
        error: err instanceof Error ? err.message : "Failed to load playlists",
      }));
    }
  }, [accessToken]);

  const fetchTracks = useCallback(
    async (source: LibrarySource) => {
      if (!accessToken) return;

      setState((s) => ({
        ...s,
        selectedSource: source,
        tracks: [],
        isLoadingTracks: true,
        loadProgress: null,
        error: null,
      }));

      try {
        const client = new SpotifyClient(accessToken);
        let tracks: Track[];

        const onProgress = (loaded: number, total: number) => {
          setState((s) => ({ ...s, loadProgress: { loaded, total } }));
        };

        if (source.type === "liked") {
          const saved = await client.getAllSavedTracks(onProgress);
          tracks = saved.map(savedTrackToTrack);
        } else {
          const playlistTracks = await client.getPlaylistTracks(
            source.playlistId,
            onProgress
          );
          tracks = playlistTracks
            .map(playlistTrackToTrack)
            .filter((t): t is Track => t !== null);
        }

        tracks = deduplicateTracks(tracks);
        setState((s) => ({
          ...s,
          tracks,
          isLoadingTracks: false,
          loadProgress: null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoadingTracks: false,
          loadProgress: null,
          error: err instanceof Error ? err.message : "Failed to load tracks",
        }));
      }
    },
    [accessToken]
  );

  return {
    ...state,
    fetchPlaylists,
    fetchTracks,
  };
}
