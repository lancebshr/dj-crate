export interface BpmLookupRequest {
  trackId: string;
  trackName: string;
  artistName: string;
}

export interface BpmResult {
  trackId: string;
  bpm: number | null;
  musicalKey: string | null;
  camelotKey: string | null;
  source: string;
}

export interface BpmProvider {
  name: string;
  lookupBatch(tracks: BpmLookupRequest[]): Promise<BpmResult[]>;
}
