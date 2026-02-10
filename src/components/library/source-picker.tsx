"use client";

import type { Playlist, LibrarySource } from "@/types";

interface SourcePickerProps {
  playlists: Playlist[];
  selectedSource: LibrarySource | null;
  isLoading: boolean;
  onSelect: (source: LibrarySource) => void;
}

export function SourcePicker({
  playlists,
  selectedSource,
  isLoading,
  onSelect,
}: SourcePickerProps) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "liked") {
      onSelect({ type: "liked" });
    } else if (value.startsWith("playlist:")) {
      const id = value.replace("playlist:", "");
      const playlist = playlists.find((p) => p.id === id);
      onSelect({
        type: "playlist",
        playlistId: id,
        playlistName: playlist?.name ?? "Playlist",
      });
    }
  }

  const currentValue =
    selectedSource?.type === "liked"
      ? "liked"
      : selectedSource?.type === "playlist"
        ? `playlist:${selectedSource.playlistId}`
        : "";

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      disabled={isLoading}
      className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-green-500 transition disabled:opacity-50 min-w-[250px]"
    >
      <option value="" disabled>
        Select a source...
      </option>
      <option value="liked">Liked Songs</option>
      {playlists.length > 0 && (
        <optgroup label="Playlists">
          {playlists.map((p) => (
            <option key={p.id} value={`playlist:${p.id}`}>
              {p.name} ({p.trackCount} tracks)
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
