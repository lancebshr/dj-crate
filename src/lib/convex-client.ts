import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// Typed function references (no codegen needed for server-side use)
export const api = {
  tracks: {
    getBatch: makeFunctionReference<
      "query",
      { lookupKeys: string[] },
      Record<
        string,
        {
          bpm: number | undefined;
          musicalKey: string | undefined;
          camelotKey: string | undefined;
          genres: string[] | undefined;
          bpmSource: string | undefined;
          genreSource: string | undefined;
        }
      >
    >("tracks:getBatch"),
    upsertBatch: makeFunctionReference<
      "mutation",
      {
        tracks: Array<{
          lookupKey: string;
          trackName: string;
          artistName: string;
          bpm?: number;
          musicalKey?: string;
          camelotKey?: string;
          genres?: string[];
          bpmSource?: string;
          genreSource?: string;
        }>;
      },
      null
    >("tracks:upsertBatch"),
  },
};

let clientInstance: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient | null {
  if (!CONVEX_URL) return null;
  if (!clientInstance) {
    clientInstance = new ConvexHttpClient(CONVEX_URL);
  }
  return clientInstance;
}
