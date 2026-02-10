"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TrackCard } from "./track-card";
import type { TrackWithBpm } from "@/types";

interface TrackListProps {
  tracks: TrackWithBpm[];
  isLoading: boolean;
  loadProgress: { loaded: number; total: number } | null;
}

const ROW_HEIGHT = 64;

export function TrackList({ tracks, isLoading, loadProgress }: TrackListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
        {loadProgress && (
          <p className="text-sm text-zinc-400">
            Loading tracks: {loadProgress.loaded.toLocaleString()} /{" "}
            {loadProgress.total.toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-500">No tracks match the current filter.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800 flex-shrink-0">
        <span className="w-12 flex-shrink-0" />
        <span className="flex-1 ml-4">TRACK</span>
        <span className="flex-shrink-0 w-24 text-right">BPM / KEY</span>
      </div>

      {/* Virtualized list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TrackCard track={tracks[virtualRow.index]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
