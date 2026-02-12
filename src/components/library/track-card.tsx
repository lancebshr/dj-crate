import { memo } from "react";
import type { TrackWithBpm } from "@/types";
import { beatportSearchUrl, soundcloudSearchUrl } from "@/lib/export";

interface TrackCardProps {
  track: TrackWithBpm;
}

export const TrackCard = memo(function TrackCard({ track }: TrackCardProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-900/50 rounded-lg transition group">
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
        {(track.genres?.length || track.vibe) && (
          <div className="flex gap-1 mt-0.5 overflow-hidden">
            {track.genres
              ?.slice(0, track.vibe ? 2 : 3)
              .map((genre) => (
                <span
                  key={genre}
                  className="text-[10px] px-1.5 py-0 rounded-full bg-purple-500/10 text-purple-400 whitespace-nowrap"
                >
                  {genre}
                </span>
              ))}
            {track.vibe && (
              <span className="text-[10px] px-1.5 py-0 rounded-full bg-amber-500/10 text-amber-400 whitespace-nowrap">
                {track.vibe}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Platform Links — visible on hover */}
      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={soundcloudSearchUrl(track)}
          target="_blank"
          rel="noopener noreferrer"
          title="Find on SoundCloud"
          className="text-[10px] px-2 py-1 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition"
        >
          SC
        </a>
        <a
          href={beatportSearchUrl(track)}
          target="_blank"
          rel="noopener noreferrer"
          title="Buy on Beatport"
          className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
        >
          BP
        </a>
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
          <span className="text-sm font-mono font-semibold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded">
            {track.camelotKey}
          </span>
        )}
      </div>
    </div>
  );
});
