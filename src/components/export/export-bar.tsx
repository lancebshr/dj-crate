"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/export";
import { TuneMyMusicModal } from "./tunemymusic-modal";
import type { TrackWithBpm } from "@/types";

interface ExportBarProps {
  tracks: TrackWithBpm[];
}

export function ExportBar({ tracks }: ExportBarProps) {
  const [showModal, setShowModal] = useState(false);

  if (tracks.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-xs text-zinc-500 mr-1">Export:</span>

        {/* TuneMyMusic transfer modal trigger */}
        <button
          onClick={() => setShowModal(true)}
          className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-md transition font-medium"
        >
          Transfer to SoundCloud
        </button>

        {/* Manual CSV download */}
        <button
          onClick={() => downloadCsv(tracks)}
          className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-md transition"
        >
          Download CSV
        </button>
      </div>

      {/* TuneMyMusic transfer modal */}
      {showModal && (
        <TuneMyMusicModal
          tracks={tracks}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
