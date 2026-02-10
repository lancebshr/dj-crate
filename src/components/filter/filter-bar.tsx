"use client";

import { BpmRangeSlider } from "./bpm-range-slider";

interface FilterBarProps {
  bpmRange: [number, number];
  onBpmRangeChange: (range: [number, number]) => void;
  isEnriching: boolean;
  enrichProgress: { completed: number; total: number };
  stats: { total: number; withBpm: number; inRange: number };
}

export function FilterBar({
  bpmRange,
  onBpmRangeChange,
  isEnriching,
  enrichProgress,
  stats,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 border-b border-zinc-800">
      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-400 flex-shrink-0">BPM Range:</span>
        <div className="flex-1 max-w-md">
          <BpmRangeSlider
            min={60}
            max={200}
            value={bpmRange}
            onChange={onBpmRangeChange}
          />
        </div>
      </div>

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
          <>
            <span>
              {stats.inRange.toLocaleString()} of{" "}
              {stats.total.toLocaleString()} tracks in range
            </span>
            {stats.total > 0 && stats.withBpm < stats.total && (
              <span className="text-zinc-600">
                ({stats.total - stats.withBpm} missing BPM)
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
