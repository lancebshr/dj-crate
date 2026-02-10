"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`Spotify authorization failed: ${errorParam}`);
      return;
    }

    if (!code || !state) {
      setError("Missing authorization code or state parameter.");
      return;
    }

    const storedState = sessionStorage.getItem("spotify_auth_state");
    if (state !== storedState) {
      setError("State mismatch — possible CSRF attack. Please try again.");
      return;
    }

    const codeVerifier = sessionStorage.getItem("spotify_code_verifier");
    if (!codeVerifier) {
      setError("Missing code verifier. Please try connecting again.");
      return;
    }

    exchangeToken(code, codeVerifier);
  }, [searchParams, router]);

  async function exchangeToken(code: string, codeVerifier: string) {
    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.details || "Token exchange failed.");
        return;
      }

      const data = await response.json();

      sessionStorage.setItem("spotify_access_token", data.access_token);
      if (data.refresh_token) {
        sessionStorage.setItem("spotify_refresh_token", data.refresh_token);
      }
      sessionStorage.setItem(
        "spotify_token_expires_at",
        String(Date.now() + data.expires_in * 1000)
      );

      sessionStorage.removeItem("spotify_auth_state");
      sessionStorage.removeItem("spotify_code_verifier");

      router.replace("/library");
    } catch {
      setError("Network error during token exchange. Please try again.");
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-400">
            Connection Failed
          </h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-green-500 text-black font-semibold rounded-full hover:bg-green-400 transition"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-400">Connecting to Spotify...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <p className="text-zinc-400">Loading...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
