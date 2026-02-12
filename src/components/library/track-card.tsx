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
          className="p-1.5 rounded-md bg-gradient-to-b from-[#ff7733] to-[#e04500] border border-[#ff8844]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(0,0,0,0.3)] hover:from-[#ff8844] hover:to-[#ff5500] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition-all"
        >
          <img src="/soundcloud.png" alt="SoundCloud" className="h-3.5 w-auto brightness-0 invert drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
        </a>
        <a
          href={beatportSearchUrl(track)}
          target="_blank"
          rel="noopener noreferrer"
          title="Buy on Beatport"
          className="p-1.5 rounded-md bg-gradient-to-b from-[#a8e619] to-[#7fb800] border border-[#b5f020]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_3px_rgba(0,0,0,0.3)] hover:from-[#b5f020] hover:to-[#94d500] active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition-all"
        >
          <img src="/beatport.png" alt="Beatport" className="h-3.5 w-auto brightness-0 invert drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
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
