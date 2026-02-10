import { NextResponse } from "next/server";
import type { SpotifyTokenResponse } from "@/lib/spotify/types";

const TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function POST(request: Request) {
  const body = await request.json();

  let params: URLSearchParams;

  if (body.refreshToken) {
    params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: body.refreshToken,
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    });

    if (process.env.SPOTIFY_CLIENT_SECRET) {
      params.set("client_secret", process.env.SPOTIFY_CLIENT_SECRET);
    }
  } else {
    params = new URLSearchParams({
      grant_type: "authorization_code",
      code: body.code,
      redirect_uri: body.redirectUri,
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
      code_verifier: body.codeVerifier,
    });
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: "Token exchange failed", details: error },
      { status: response.status }
    );
  }

  const data: SpotifyTokenResponse = await response.json();
  return NextResponse.json(data);
}
