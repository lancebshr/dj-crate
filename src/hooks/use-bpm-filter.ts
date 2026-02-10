"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Track, TrackWithBpm } from "@/types";
import type { BpmResult } from "@/lib/bpm/types";

const BATCH_SIZE = 20;

interface BpmFilterState {
  bpmData: Map<string, BpmResult>;
  bpmRange: [number, number];
  isEnriching: boolean;
  enrichProgress: { completed: number; total: number };
}

interface UseBpmFilterOptions {
  /** Pre-existing BPM data (e.g., from a CSV with tempo column) */
  initialBpmMap?: Map<string, number>;
}

export function useBpmFilter(tracks: Track[], options?: UseBpmFilterOptions) {
  const [state, setState] = useState<BpmFilterState>({
    bpmData: new Map(),
    bpmRange: [60, 200],
    isEnriching: false,
    enrichProgress: { completed: 0, total: 0 },
  });

  const abortRef = useRef<AbortController | null>(null);

  // Enrich tracks with BPM data when tracks change
  useEffect(() => {
    if (tracks.length === 0) {
      setState((s) => ({
        ...s,
        bpmData: new Map(),
        isEnriching: false,
        enrichProgress: { completed: 0, total: 0 },
      }));
      return;
    }

    // Abort any previous enrichment
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    // Seed with any initial BPM data from CSV
    const seededBpmData = new Map<string, BpmResult>();
    if (options?.initialBpmMap) {
      for (const [trackId, bpm] of options.initialBpmMap) {
        seededBpmData.set(trackId, {
          trackId,
          bpm,
          musicalKey: null,
          camelotKey: null,
          source: "csv",
        });
      }
    }

    enrichTracks(tracks, controller.signal, seededBpmData);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, options?.initialBpmMap]);

  async function enrichTracks(
    tracks: Track[],
    signal: AbortSignal,
    seededData: Map<string, BpmResult>
  ) {
    const newBpmData = new Map(seededData);

    // Figure out which tracks still need BPM lookup
    const tracksToLookup = tracks.filter((t) => !newBpmData.has(t.id));

    // If all tracks already have BPM data (e.g., full Exportify CSV), we're done
    if (tracksToLookup.length === 0) {
      setState((s) => ({
        ...s,
        bpmData: newBpmData,
        isEnriching: false,
        enrichProgress: { completed: tracks.length, total: tracks.length },
      }));
      return;
    }

    setState((s) => ({
      ...s,
      bpmData: newBpmData,
      isEnriching: true,
      enrichProgress: {
        completed: tracks.length - tracksToLookup.length,
        total: tracks.length,
      },
    }));

    let completed = tracks.length - tracksToLookup.length;

    // Process in batches
    for (let i = 0; i < tracksToLookup.length; i += BATCH_SIZE) {
      if (signal.aborted) return;

      const batch = tracksToLookup.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch("/api/bpm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tracks: batch.map((t) => ({
              trackId: t.id,
              trackName: t.name,
              artistName: t.artist,
            })),
          }),
          signal,
        });

        if (!response.ok) {
          completed += batch.length;
          setState((s) => ({
            ...s,
            enrichProgress: { completed, total: tracks.length },
          }));
          continue;
        }

        const data = await response.json();
        const results: BpmResult[] = data.results;

        for (const result of results) {
          newBpmData.set(result.trackId, result);
        }

        completed += batch.length;

        setState((s) => ({
          ...s,
          bpmData: new Map(newBpmData),
          enrichProgress: { completed, total: tracks.length },
        }));
      } catch (err) {
        if (signal.aborted) return;
        completed += batch.length;
        setState((s) => ({
          ...s,
          enrichProgress: { completed, total: tracks.length },
        }));
      }
    }

    if (!signal.aborted) {
      setState((s) => ({ ...s, isEnriching: false }));
    }
  }

  const setBpmRange = useCallback((range: [number, number]) => {
    setState((s) => ({ ...s, bpmRange: range }));
  }, []);

  const enrichedTracks: TrackWithBpm[] = useMemo(() => {
    return tracks.map((track) => {
      const bpm = state.bpmData.get(track.id);
      return {
        ...track,
        bpm: bpm?.bpm ?? null,
        musicalKey: bpm?.musicalKey ?? null,
        camelotKey: bpm?.camelotKey ?? null,
        bpmSource: bpm?.source ?? null,
        bpmLoading: !bpm && state.isEnriching,
      };
    });
  }, [tracks, state.bpmData, state.isEnriching]);

  const filteredTracks: TrackWithBpm[] = useMemo(() => {
    const [min, max] = state.bpmRange;
    return enrichedTracks.filter((t) => {
      if (t.bpm === null) return false;
      return t.bpm >= min && t.bpm <= max;
    });
  }, [enrichedTracks, state.bpmRange]);

  const stats = useMemo(() => {
    const withBpm = enrichedTracks.filter((t) => t.bpm !== null).length;
    return {
      total: enrichedTracks.length,
      withBpm,
      inRange: filteredTracks.length,
    };
  }, [enrichedTracks, filteredTracks]);

  return {
    enrichedTracks,
    filteredTracks,
    bpmRange: state.bpmRange,
    setBpmRange,
    isEnriching: state.isEnriching,
    enrichProgress: state.enrichProgress,
    stats,
  };
}
