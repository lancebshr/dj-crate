"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSpotifyAuth } from "@/hooks/use-spotify-auth";
import { ConnectButton } from "@/components/auth/connect-button";
import { CsvUpload } from "@/components/upload/csv-upload";
import { parseCsv } from "@/lib/csv/parser";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useSpotifyAuth();
  const [csvError, setCsvError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/library");
    }
  }, [isAuthenticated, router]);

  const handleCsvLoaded = useCallback(
    (csvText: string) => {
      setCsvError(null);

      const result = parseCsv(csvText);

      if (result.errors.length > 0) {
        setCsvError(result.errors.join(" "));
        return;
      }

      // Store parsed data in sessionStorage for the library page
      sessionStorage.setItem("csv_tracks", JSON.stringify(result.tracks));
      sessionStorage.setItem("csv_raw", csvText);
      if (result.hasBpmData) {
        // Store BPM map as array of [id, bpm] pairs
        sessionStorage.setItem(
          "csv_bpm_map",
          JSON.stringify(Array.from(result.bpmMap.entries()))
        );
      }
      if (result.keyMap.size > 0) {
        sessionStorage.setItem(
          "csv_key_map",
          JSON.stringify(Array.from(result.keyMap.entries()))
        );
      }
      sessionStorage.setItem("import_source", "csv");

      router.push("/library");
    },
    [router]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg flex flex-col items-center gap-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-6xl font-bold tracking-tight mb-3">dj-crate</h1>
          <p className="text-xl text-zinc-400">
            Filter your Spotify library by BPM
          </p>
        </div>

        {/* CSV Upload — Primary */}
        <div className="w-full">
          <CsvUpload onFileLoaded={handleCsvLoaded} />
          {csvError && (
            <p className="text-sm text-red-400 mt-2">{csvError}</p>
          )}
          <p className="text-xs text-zinc-600 mt-3 text-center">
            Export your Spotify playlists with{" "}
            <a
              href="https://exportify.net"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-400"
            >
              Exportify
            </a>{" "}
            and drop the CSV here. Works with any CSV that has track name +
            artist columns.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 border-t border-zinc-800" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="flex-1 border-t border-zinc-800" />
        </div>

        {/* Spotify Connect — Secondary */}
        <div className="flex flex-col items-center gap-2">
          <ConnectButton onClick={login} />
          <p className="text-xs text-zinc-600 text-center">
            Limited to 5 users in Spotify dev mode
          </p>
        </div>
      </div>
    </div>
  );
}
