import type { TrackWithBpm } from "@/types";

interface TrackCardProps {
  track: TrackWithBpm;
}

export function TrackCard({ track }: TrackCardProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-900/50 rounded-lg transition">
      {/* Album Art */}
      <div className="w-12 h-12 flex-shrink-0 rounded bg-zinc-800 overflow-hidden">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
            ?
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{track.name}</p>
        <p className="text-xs text-zinc-400 truncate">
          {track.artist} &middot; {track.album}
        </p>
      </div>

      {/* BPM + Key */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {track.bpmLoading ? (
          <div className="animate-spin h-4 w-4 border border-zinc-600 border-t-green-500 rounded-full" />
        ) : track.bpm !== null ? (
          <span className="text-sm font-mono font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
            {Math.round(track.bpm)}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">--</span>
        )}

        {track.camelotKey && (
          <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
            {track.camelotKey}
          </span>
        )}
      </div>
    </div>
  );
}
