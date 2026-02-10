"use client";

import { useState, useEffect, useCallback } from "react";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthUrl,
} from "@/lib/spotify/auth";
import type { SpotifyUser } from "@/lib/spotify/types";

interface AuthState {
  accessToken: string | null;
  user: SpotifyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useSpotifyAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    accessToken: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = sessionStorage.getItem("spotify_refresh_token");
    if (!refreshToken) return null;

    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      sessionStorage.setItem("spotify_access_token", data.access_token);
      if (data.refresh_token) {
        sessionStorage.setItem("spotify_refresh_token", data.refresh_token);
      }
      sessionStorage.setItem(
        "spotify_token_expires_at",
        String(Date.now() + data.expires_in * 1000)
      );

      return data.access_token as string;
    } catch {
      return null;
    }
  }, []);

  const fetchUser = useCallback(async (token: string) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      return (await response.json()) as SpotifyUser;
    } catch {
      return null;
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    async function init() {
      let token = sessionStorage.getItem("spotify_access_token");
      const expiresAt = sessionStorage.getItem("spotify_token_expires_at");

      if (!token) {
        setAuthState((s) => ({ ...s, isLoading: false }));
        return;
      }

      // Refresh if expired or expiring within 5 minutes
      if (expiresAt && Date.now() > Number(expiresAt) - 5 * 60 * 1000) {
        token = await refreshAccessToken();
        if (!token) {
          setAuthState((s) => ({ ...s, isLoading: false }));
          return;
        }
      }

      const user = await fetchUser(token);
      setAuthState({
        accessToken: token,
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
    }

    init();
  }, [refreshAccessToken, fetchUser]);

  // Auto-refresh timer
  useEffect(() => {
    const expiresAt = sessionStorage.getItem("spotify_token_expires_at");
    if (!expiresAt || !authState.isAuthenticated) return;

    const refreshIn = Number(expiresAt) - Date.now() - 5 * 60 * 1000;
    if (refreshIn <= 0) return;

    const timer = setTimeout(async () => {
      const token = await refreshAccessToken();
      if (token) {
        const user = await fetchUser(token);
        setAuthState({
          accessToken: token,
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      }
    }, refreshIn);

    return () => clearTimeout(timer);
  }, [authState.isAuthenticated, refreshAccessToken, fetchUser]);

  async function login() {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("Missing Spotify client ID or redirect URI");
      return;
    }

    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();

    sessionStorage.setItem("spotify_code_verifier", verifier);
    sessionStorage.setItem("spotify_auth_state", state);

    const url = buildAuthUrl({
      clientId,
      redirectUri,
      codeChallenge: challenge,
      state,
    });

    window.location.href = url;
  }

  function logout() {
    sessionStorage.removeItem("spotify_access_token");
    sessionStorage.removeItem("spotify_refresh_token");
    sessionStorage.removeItem("spotify_token_expires_at");
    setAuthState({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  return {
    ...authState,
    login,
    logout,
    refreshAccessToken,
  };
}
