"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { useLibrary } from "@/hooks/use-library";
import { useBpmFilter } from "@/hooks/use-bpm-filter";
import { SourcePicker } from "@/components/library/source-picker";
import { TrackList } from "@/components/library/track-list";
import { FilterBar } from "@/components/filter/filter-bar";
import type { Track } from "@/types";

type ImportMode = "csv" | "spotify" | null;

export default function LibraryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken, user, logout } =
    useSpotifyAuth();

  const [importMode, setImportMode] = useState<ImportMode>(null);
  const [csvTracks, setCsvTracks] = useState<Track[]>([]);
  const [csvBpmMap, setCsvBpmMap] = useState<Map<string, number> | undefined>(
    undefined
  );

  const {
    tracks: spotifyTracks,
    playlists,
    selectedSource,
    isLoadingPlaylists,
    isLoadingTracks,
    loadProgress,
    error: spotifyError,
    fetchPlaylists,
    fetchTracks,
  } = useLibrary(accessToken);

  // Determine which tracks to use based on import mode
  const activeTracks = importMode === "csv" ? csvTracks : spotifyTracks;

  const {
    filteredTracks,
    bpmRange,
    setBpmRange,
    isEnriching,
    enrichProgress,
    stats,
  } = useBpmFilter(activeTracks, { initialBpmMap: csvBpmMap });

  // On mount, check which import mode we're in
  useEffect(() => {
    const source = sessionStorage.getItem("import_source");

    if (source === "csv") {
      setImportMode("csv");

      const tracksJson = sessionStorage.getItem("csv_tracks");
      if (tracksJson) {
        setCsvTracks(JSON.parse(tracksJson));
      }

      const bpmJson = sessionStorage.getItem("csv_bpm_map");
      if (bpmJson) {
        const entries: [string, number][] = JSON.parse(bpmJson);
        setCsvBpmMap(new Map(entries));
      }
    } else if (isAuthenticated) {
      setImportMode("spotify");
    }
  }, [isAuthenticated]);

  // Redirect if no import source and not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && importMode !== "csv") {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, importMode, router]);

  // Fetch playlists when in Spotify mode
  useEffect(() => {
    if (importMode === "spotify" && accessToken) {
      fetchPlaylists();
    }
  }, [importMode, accessToken, fetchPlaylists]);

  function handleBack() {
    sessionStorage.removeItem("csv_tracks");
    sessionStorage.removeItem("csv_bpm_map");
    sessionStorage.removeItem("import_source");
    router.replace("/");
  }

  if (authLoading && importMode !== "csv") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isLoading = importMode === "spotify" && isLoadingTracks;
  const hasTracks = activeTracks.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
        <h1 className="text-xl font-bold">dj-crate</h1>
        <div className="flex items-center gap-4">
          {importMode === "csv" && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
              CSV Import
            </span>
          )}
          {importMode === "spotify" && user && (
            <span className="text-sm text-zinc-400">{user.display_name}</span>
          )}
          <button
            onClick={importMode === "spotify" ? logout : handleBack}
            className="text-sm text-zinc-500 hover:text-white transition"
          >
            {importMode === "spotify" ? "Logout" : "Back"}
          </button>
        </div>
      </header>

      {/* Source Picker — Spotify mode only */}
      {importMode === "spotify" && (
        <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <SourcePicker
            playlists={playlists}
            selectedSource={selectedSource}
            isLoading={isLoadingPlaylists}
            onSelect={fetchTracks}
          />
          {selectedSource && !isLoadingTracks && spotifyTracks.length > 0 && (
            <span className="text-sm text-zinc-400">
              {spotifyTracks.length.toLocaleString()} tracks loaded
            </span>
          )}
        </div>
      )}

      {/* CSV info bar */}
      {importMode === "csv" && hasTracks && (
        <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <span className="text-sm text-zinc-400">
            {csvTracks.length.toLocaleString()} tracks imported
          </span>
          {csvBpmMap && csvBpmMap.size > 0 && (
            <span className="text-xs text-green-500">
              {csvBpmMap.size.toLocaleString()} with BPM from CSV
            </span>
          )}
        </div>
      )}

      {/* BPM Filter */}
      {hasTracks && !isLoading && (
        <FilterBar
          bpmRange={bpmRange}
          onBpmRangeChange={setBpmRange}
          isEnriching={isEnriching}
          enrichProgress={enrichProgress}
          stats={stats}
        />
      )}

      {/* Error */}
      {spotifyError && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
          <p className="text-sm text-red-400">{spotifyError}</p>
        </div>
      )}

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        {importMode === "csv" && hasTracks ? (
          <TrackList
            tracks={filteredTracks}
            isLoading={false}
            loadProgress={null}
          />
        ) : importMode === "spotify" && selectedSource ? (
          <TrackList
            tracks={filteredTracks}
            isLoading={isLoadingTracks}
            loadProgress={loadProgress}
          />
        ) : (
          <div className="flex items-center justify-center py-16">
            <p className="text-zinc-500">
              {importMode === "spotify"
                ? "Select a source to load your tracks."
                : "No tracks loaded."}
            </p>
          </div>
        )}
      </div>

      {/* Attribution Footer */}
      <footer className="px-6 py-3 border-t border-zinc-800 text-xs text-zinc-600 text-center flex-shrink-0">
        BPM data by{" "}
        <a
          href="https://getsongbpm.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-400"
        >
          GetSongBPM
        </a>
        {" & "}
        <a
          href="https://rapidapi.com/soundnet-soundnet-default/api/track-analysis"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-400"
        >
          SoundNet
        </a>
      </footer>
    </div>
  );
}
