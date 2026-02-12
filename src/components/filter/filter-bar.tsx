"use client";

import { useState } from "react";
import { BpmRangeSlider } from "./bpm-range-slider";

const TOP_PILL_COUNT = 6;

interface FilterBarProps {
  bpmRange: [number, number];
  bpmBounds: [number, number];
  onBpmRangeChange: (range: [number, number]) => void;
  bpmNormalized: boolean;
  onToggleBpmNormalized: () => void;
  isEnriching: boolean;
  enrichProgress: { completed: number; total: number };
  isTagging: boolean;
  tagProgress: { completed: number; tagged: number; total: number };
  stats: { total: number; withBpm: number; inRange: number };
  availableGenres: string[];
  selectedGenres: Set<string>;
  onToggleGenre: (genre: string) => void;
  onClearGenres: () => void;
}

export function FilterBar({
  bpmRange,
  bpmBounds,
  onBpmRangeChange,
  bpmNormalized,
  onToggleBpmNormalized,
  isEnriching,
  enrichProgress,
  isTagging,
  tagProgress,
  stats,
  availableGenres,
  selectedGenres,
  onToggleGenre,
  onClearGenres,
}: FilterBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const topGenres = availableGenres.slice(0, TOP_PILL_COUNT);
  const moreGenres = availableGenres.slice(TOP_PILL_COUNT);
  // Count how many "more" genres are currently selected
  const moreSelectedCount = moreGenres.filter((g) => selectedGenres.has(g)).length;

  return (
    <div className="flex flex-col gap-3 px-6 py-4 border-b border-zinc-800">
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-400 flex-shrink-0">BPM Range:</span>
        <div className="flex-1 max-w-md">
          <BpmRangeSlider
            min={bpmBounds[0]}
            max={bpmBounds[1]}
            value={bpmRange}
            onChange={onBpmRangeChange}
          />
        </div>
        <button
          onClick={onToggleBpmNormalized}
          className={`text-xs px-2.5 py-1 rounded-md transition font-medium flex-shrink-0 ${
            bpmNormalized
              ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/40"
              : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-400"
          }`}
          title={bpmNormalized ? "BPM normalized to 80-160 (click for raw)" : "Showing raw BPM (click to normalize)"}
        >
          {bpmNormalized ? "Normalized" : "Raw BPM"}
        </button>
      </div>

      {/* Genre filter: top pills + "More" dropdown */}
      {availableGenres.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap relative">
          <span className="text-sm text-zinc-400 flex-shrink-0">Genres:</span>
          {selectedGenres.size > 0 && (
            <button
              onClick={onClearGenres}
              className="text-[10px] px-2 py-1 rounded-full bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition"
            >
              Clear
            </button>
          )}
          {topGenres.map((genre) => (
            <GenrePill
              key={genre}
              genre={genre}
              isSelected={selectedGenres.has(genre)}
              onToggle={onToggleGenre}
            />
          ))}

          {/* "More" dropdown for remaining genres */}
          {moreGenres.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={`text-xs px-2.5 py-1 rounded-full transition font-medium ${
                  moreSelectedCount > 0
                    ? "bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                }`}
              >
                More{moreSelectedCount > 0 ? ` (${moreSelectedCount})` : ` (+${moreGenres.length})`}
              </button>
              {moreOpen && (
                <>
                  {/* Invisible backdrop to close dropdown */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMoreOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px] max-h-60 overflow-y-auto">
                    {moreGenres.map((genre) => {
                      const isSelected = selectedGenres.has(genre);
                      return (
                        <button
                          key={genre}
                          onClick={() => onToggleGenre(genre)}
                          className={`w-full text-left text-xs px-3 py-1.5 transition ${
                            isSelected
                              ? "text-purple-300 bg-purple-500/20"
                              : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
                          }`}
                        >
                          {genre}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        {isEnriching ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border border-zinc-600 border-t-green-500 rounded-full" />
            <span>
              Loading BPM: {enrichProgress.completed.toLocaleString()} /{" "}
              {enrichProgress.total.toLocaleString()}
            </span>
          </div>
        ) : (
          <span>
            {stats.inRange.toLocaleString()} of{" "}
            {stats.total.toLocaleString()} tracks in range
          </span>
        )}
        {isTagging && (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border border-zinc-600 border-t-purple-500 rounded-full" />
            <span>
              Tagging: {tagProgress.tagged.toLocaleString()} tagged ({tagProgress.completed.toLocaleString()} / {tagProgress.total.toLocaleString()})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function GenrePill({
  genre,
  isSelected,
  onToggle,
}: {
  genre: string;
  isSelected: boolean;
  onToggle: (genre: string) => void;
}) {
  return (
    <button
      onClick={() => onToggle(genre)}
      className={`text-xs px-2.5 py-1 rounded-full transition font-medium ${
        isSelected
          ? "bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50"
          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
      }`}
    >
      {genre}
    </button>
  );
}
