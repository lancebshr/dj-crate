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
          className="p-1.5 rounded bg-orange-500/10 hover:bg-orange-500/20 transition"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-orange-400">
            <path d="M11.56 8.87V17h8.76c1.85 0 3.35-1.53 3.35-3.43 0-1.9-1.5-3.43-3.35-3.43-.35 0-.68.05-1 .14C19.04 8.15 17.24 6.3 15 6.3c-1.1 0-2.1.45-2.82 1.17-.18.18-.44.2-.62.4zM8.8 9.67v7.33h1.53V9.17c-.5-.17-1.03-.23-1.53-.15v.65zM6.27 10.3v6.7h1.53v-7.2c-.53.07-1.04.23-1.53.5zM3.74 12.04v4.96h1.53v-5.73c-.54.15-1.05.4-1.53.77zM1.21 13.4v3.6h1.53v-4.1c-.56.07-1.08.24-1.53.5z" />
          </svg>
        </a>
        <a
          href={beatportSearchUrl(track)}
          target="_blank"
          rel="noopener noreferrer"
          title="Buy on Beatport"
          className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 transition"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-emerald-400">
            <path d="M21.429 6.613c-1.648-.793-3.794-.53-5.576.683a7.264 7.264 0 0 0-.603.471 5.382 5.382 0 0 0-.879-.58c-2.444-1.285-5.534-.34-6.9 2.112-1.366 2.45-.42 5.55 2.025 6.836.732.385 1.513.553 2.278.536l-1.677 3.009h2.381l1.498-2.688a5.36 5.36 0 0 0 2.67-1.313c.401.132.827.21 1.27.21 2.58 0 4.672-2.1 4.672-4.691 0-1.563-.762-2.948-1.933-3.804.262-.366.564-.72.924-1.04l.85-.74zm-5.088 8.377a3.15 3.15 0 0 1-2.224-.921 3.593 3.593 0 0 1-.476-.6c.436-.86.56-1.855.276-2.817a3.146 3.146 0 0 1 2.424-1.156 3.164 3.164 0 0 1 3.157 3.164 3.164 3.164 0 0 1-3.157 3.33z" />
          </svg>
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
