import { NextResponse } from "next/server";
import { createBpmProviderChain } from "@/lib/bpm/provider";
import type { BpmLookupRequest } from "@/lib/bpm/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tracks: BpmLookupRequest[] = body.tracks;

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json(
        { error: "tracks array is required" },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (tracks.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 tracks per request" },
        { status: 400 }
      );
    }

    const chain = createBpmProviderChain();
    const results = await chain.lookup(tracks);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("BPM lookup error:", err);
    return NextResponse.json(
      { error: "BPM lookup failed" },
      { status: 500 }
    );
  }
}
