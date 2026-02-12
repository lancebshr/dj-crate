"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Track, TrackWithBpm } from "@/types";
import type { BpmResult } from "@/lib/bpm/types";
import { deriveVibe } from "@/lib/vibe-tagger";

const BATCH_SIZE = 20;
const GENRE_BATCH_SIZE = 50;
const GENRE_CONCURRENCY = 3;

/** Normalize BPM into the DJ-standard 80-160 range by halving or doubling. */
function normalizeBpm(bpm: number): number {
  let v = bpm;
  while (v > 160) v /= 2;
  while (v < 80) v *= 2;
  return Math.round(v * 10) / 10;
}

const BPM_NORM_MIN = 80;
const BPM_NORM_MAX = 160;
const BPM_RAW_MIN = 60;
const BPM_RAW_MAX = 200;

interface BpmFilterState {
  bpmData: Map<string, BpmResult>;
  genreData: Map<string, string[]>;
  bpmRange: [number, number];
  bpmNormalized: boolean;
  selectedGenres: Set<string>;
  isEnriching: boolean;
  enrichProgress: { completed: number; total: number };
  isTagging: boolean;
  tagProgress: { completed: number; tagged: number; total: number };
}

interface UseBpmFilterOptions {
  /** Pre-existing BPM data (e.g., from a CSV with tempo column) */
  initialBpmMap?: Map<string, number>;
  /** Pre-existing Camelot key data (e.g., from a CSV with key column) */
  initialKeyMap?: Map<string, string>;
}

export function useBpmFilter(tracks: Track[], options?: UseBpmFilterOptions) {
  const [state, setState] = useState<BpmFilterState>({
    bpmData: new Map(),
    genreData: new Map(),
    bpmRange: [BPM_NORM_MIN, BPM_NORM_MAX],
    bpmNormalized: true,
    selectedGenres: new Set(),
    isEnriching: false,
    enrichProgress: { completed: 0, total: 0 },
    isTagging: false,
    tagProgress: { completed: 0, tagged: 0, total: 0 },
  });

  const abortRef = useRef<AbortController | null>(null);

  // Enrich tracks with BPM data when tracks change
  useEffect(() => {
    if (tracks.length === 0) {
      setState((s) => ({
        ...s,
        bpmData: new Map(),
        genreData: new Map(),
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

    // Seed with any initial BPM + key data from CSV
    const seededBpmData = new Map<string, BpmResult>();
    if (options?.initialBpmMap) {
      for (const [trackId, bpm] of options.initialBpmMap) {
        seededBpmData.set(trackId, {
          trackId,
          bpm,
          musicalKey: null,
          camelotKey: options.initialKeyMap?.get(trackId) ?? null,
          source: "csv",
        });
      }
    }
    // Also seed tracks that have key data but no BPM
    if (options?.initialKeyMap) {
      for (const [trackId, camelotKey] of options.initialKeyMap) {
        if (!seededBpmData.has(trackId)) {
          seededBpmData.set(trackId, {
            trackId,
            bpm: null,
            musicalKey: null,
            camelotKey,
            source: "csv",
          });
        }
      }
    }

    enrichTracks(tracks, controller.signal, seededBpmData);
    enrichGenres(tracks, controller.signal);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, options?.initialBpmMap, options?.initialKeyMap]);

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

  async function enrichGenres(tracks: Track[], signal: AbortSignal) {
    const newGenreData = new Map<string, string[]>();
    let completed = 0;

    setState((s) => ({
      ...s,
      isTagging: true,
      tagProgress: { completed: 0, tagged: 0, total: tracks.length },
    }));

    // Build all batches upfront
    const batches: Track[][] = [];
    for (let i = 0; i < tracks.length; i += GENRE_BATCH_SIZE) {
      batches.push(tracks.slice(i, i + GENRE_BATCH_SIZE));
    }

    // Process batches with concurrency limit
    let batchIdx = 0;

    async function worker() {
      while (true) {
        const idx = batchIdx++;
        if (idx >= batches.length || signal.aborted) break;

        const batch = batches[idx];
        try {
          const response = await fetch("/api/genres", {
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

          completed += batch.length;

          if (!response.ok) {
            setState((s) => ({
              ...s,
              tagProgress: { completed, tagged: newGenreData.size, total: tracks.length },
            }));
            continue;
          }

          const data = await response.json();
          const results: Array<{ trackId: string; genres: string[] }> =
            data.results;

          for (const result of results) {
            if (result.genres.length > 0) {
              newGenreData.set(result.trackId, result.genres);
            }
          }

          setState((s) => ({
            ...s,
            genreData: new Map(newGenreData),
            tagProgress: { completed, tagged: newGenreData.size, total: tracks.length },
          }));
        } catch {
          if (signal.aborted) return;
          completed += batch.length;
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(GENRE_CONCURRENCY, batches.length) },
        () => worker()
      )
    );

    if (!signal.aborted) {
      setState((s) => ({ ...s, isTagging: false }));
    }
  }

  const setBpmRange = useCallback((range: [number, number]) => {
    setState((s) => ({ ...s, bpmRange: range }));
  }, []);

  const toggleBpmNormalized = useCallback(() => {
    setState((s) => {
      const next = !s.bpmNormalized;
      return {
        ...s,
        bpmNormalized: next,
        bpmRange: next
          ? [BPM_NORM_MIN, BPM_NORM_MAX]
          : [BPM_RAW_MIN, BPM_RAW_MAX],
      };
    });
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setState((s) => {
      const next = new Set(s.selectedGenres);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }
      return { ...s, selectedGenres: next };
    });
  }, []);

  const clearGenres = useCallback(() => {
    setState((s) => ({ ...s, selectedGenres: new Set() }));
  }, []);

  const enrichedTracks: TrackWithBpm[] = useMemo(() => {
    const shouldNormalize = state.bpmNormalized;
    return tracks.map((track) => {
      const bpm = state.bpmData.get(track.id);
      const genres = state.genreData.get(track.id) ?? bpm?.genres ?? null;
      const rawBpm = bpm?.bpm ?? null;
      const bpmVal = rawBpm != null && shouldNormalize ? normalizeBpm(rawBpm) : rawBpm;
      const hasGenres = genres && genres.length > 0;
      return {
        ...track,
        bpm: bpmVal,
        musicalKey: bpm?.musicalKey ?? null,
        camelotKey: bpm?.camelotKey ?? null,
        bpmSource: bpm?.source ?? null,
        bpmLoading: !bpm && state.isEnriching,
        genres: hasGenres ? genres : null,
        vibe: hasGenres ? deriveVibe(genres, bpmVal) : null,
      };
    });
  }, [tracks, state.bpmData, state.genreData, state.isEnriching, state.bpmNormalized]);

  const availableGenres: string[] = useMemo(() => {
    // DJ-centric genres pinned at the top regardless of frequency
    const DJ_PRIORITY = [
      "electronic", "house", "techno", "dance", "edm",
      "hip hop", "r&b", "pop", "drum and bass", "trance",
    ];

    const counts = new Map<string, number>();
    for (const t of enrichedTracks) {
      if (t.genres) {
        for (const g of t.genres) {
          counts.set(g, (counts.get(g) ?? 0) + 1);
        }
      }
    }

    const prioritySet = new Set(DJ_PRIORITY);
    const pinned = DJ_PRIORITY.filter((g) => counts.has(g));
    const rest = [...counts.entries()]
      .filter(([genre]) => !prioritySet.has(genre))
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    return [...pinned, ...rest];
  }, [enrichedTracks]);

  const filteredTracks: TrackWithBpm[] = useMemo(() => {
    const [min, max] = state.bpmRange;
    const hasGenreFilter = state.selectedGenres.size > 0;
    return enrichedTracks.filter((t) => {
      if (t.bpm === null) return false;
      if (t.bpm < min || t.bpm > max) return false;
      if (hasGenreFilter) {
        if (!t.genres || !t.genres.some((g) => state.selectedGenres.has(g))) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedTracks, state.bpmRange, state.selectedGenres]);

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
    bpmNormalized: state.bpmNormalized,
    toggleBpmNormalized,
    bpmBounds: state.bpmNormalized
      ? ([BPM_NORM_MIN, BPM_NORM_MAX] as [number, number])
      : ([BPM_RAW_MIN, BPM_RAW_MAX] as [number, number]),
    availableGenres,
    selectedGenres: state.selectedGenres,
    toggleGenre,
    clearGenres,
    isEnriching: state.isEnriching,
    enrichProgress: state.enrichProgress,
    isTagging: state.isTagging,
    tagProgress: state.tagProgress,
    stats,
  };
}
