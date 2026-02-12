"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { copyAsText } from "@/lib/export";
import type { TrackWithBpm } from "@/types";

const MAX_FREE = 500;

interface TuneMyMusicModalProps {
  tracks: TrackWithBpm[];
  onClose: () => void;
}

export function TuneMyMusicModal({ tracks, onClose }: TuneMyMusicModalProps) {
  const needsSplit = tracks.length > MAX_FREE;
  const totalParts = needsSplit ? Math.ceil(tracks.length / MAX_FREE) : 1;

  const [currentPart, setCurrentPart] = useState(1);
  const [copied, setCopied] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Get tracks for current part
  const getPartTracks = useCallback(
    (part: number) => {
      if (!needsSplit) return tracks;
      const start = (part - 1) * MAX_FREE;
      return tracks.slice(start, start + MAX_FREE);
    },
    [tracks, needsSplit]
  );

  // Copy current part to clipboard
  const copyCurrentPart = useCallback(() => {
    const partTracks = getPartTracks(currentPart);
    const text = copyAsText(partTracks);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [currentPart, getPartTracks]);

  // Auto-copy on mount and when part changes
  useEffect(() => {
    setCopied(false);
    copyCurrentPart();
  }, [copyCurrentPart]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleOpen() {
    window.open("https://www.tunemymusic.com/transfer", "_blank");
  }

  const partTracks = getPartTracks(currentPart);

  return createPortal(
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Transfer to SoundCloud
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Track count + copy status */}
        <div className="bg-zinc-800 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">
              {needsSplit ? (
                <>
                  Part {currentPart} of {totalParts}
                  <span className="text-zinc-500 ml-1">
                    ({partTracks.length} tracks)
                  </span>
                </>
              ) : (
                <>{tracks.length} tracks ready</>
              )}
            </span>
            <div className="flex items-center gap-2">
              {copied && (
                <span className="text-xs text-green-400">Copied!</span>
              )}
              <button
                onClick={copyCurrentPart}
                className="text-xs px-2.5 py-1 rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>

        {/* Split info when needed */}
        {needsSplit && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-amber-400">
              TuneMyMusic&apos;s free plan supports {MAX_FREE} songs per
              transfer. Your {tracks.length} tracks have been split into{" "}
              {totalParts} parts. Transfer each part separately.
            </p>
          </div>
        )}

        {/* Part selector when split */}
        {needsSplit && (
          <div className="flex items-center gap-2 mb-4">
            {Array.from({ length: totalParts }, (_, i) => i + 1).map(
              (part) => (
                <button
                  key={part}
                  onClick={() => setCurrentPart(part)}
                  className={`text-xs px-3 py-1.5 rounded-md transition font-medium ${
                    part === currentPart
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  Part {part}
                </button>
              )
            )}
          </div>
        )}

        {/* Free plan note when under limit */}
        {!needsSplit && (
          <div className="bg-zinc-800/50 rounded-lg px-4 py-2.5 mb-4">
            <p className="text-xs text-zinc-500">
              Free plan: up to {MAX_FREE} songs per transfer
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Steps
          </h3>
          <ol className="space-y-2 text-sm text-zinc-300">
            <li className="flex gap-2">
              <span className="text-green-400 font-mono font-bold">1.</span>
              <span>
                Click{" "}
                <strong className="text-white">
                  &quot;Open TuneMyMusic&quot;
                </strong>{" "}
                below
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-400 font-mono font-bold">2.</span>
              <span>
                Select{" "}
                <strong className="text-white">&quot;Free Text&quot;</strong> as
                the source
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-400 font-mono font-bold">3.</span>
              <span>
                Paste your tracks{" "}
                <span className="text-zinc-500">
                  (already on your clipboard)
                </span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-400 font-mono font-bold">4.</span>
              <span>
                Choose{" "}
                <strong className="text-white">SoundCloud</strong> as the
                destination
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-400 font-mono font-bold">5.</span>
              <span>Start the transfer</span>
            </li>
          </ol>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleOpen}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition text-sm"
          >
            Open TuneMyMusic
          </button>
          {needsSplit && currentPart < totalParts && (
            <button
              onClick={() => setCurrentPart((p) => p + 1)}
              className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition text-sm"
            >
              Next Part
            </button>
          )}
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
