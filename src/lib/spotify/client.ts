import type {
  SpotifyPaginatedResponse,
  SpotifySavedTrack,
  SpotifyPlaylist,
  SpotifyPlaylistTrack,
  SpotifyUser,
} from "./types";

const BASE_URL = "https://api.spotify.com/v1";
const PAGE_SIZE = 50;
const RATE_LIMIT_DELAY = 200;

export class SpotifyClient {
  constructor(private accessToken: string) {}

  async getMe(): Promise<SpotifyUser> {
    return this.fetchJson(`${BASE_URL}/me`);
  }

  async getAllSavedTracks(
    onProgress?: (loaded: number, total: number) => void
  ): Promise<SpotifySavedTrack[]> {
    return this.fetchAllPages<SpotifySavedTrack>(
      `${BASE_URL}/me/tracks?limit=${PAGE_SIZE}`,
      onProgress
    );
  }

  async getPlaylists(
    onProgress?: (loaded: number, total: number) => void
  ): Promise<SpotifyPlaylist[]> {
    return this.fetchAllPages<SpotifyPlaylist>(
      `${BASE_URL}/me/playlists?limit=${PAGE_SIZE}`,
      onProgress
    );
  }

  async getPlaylistTracks(
    playlistId: string,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<SpotifyPlaylistTrack[]> {
    return this.fetchAllPages<SpotifyPlaylistTrack>(
      `${BASE_URL}/playlists/${playlistId}/tracks?limit=${PAGE_SIZE}`,
      onProgress
    );
  }

  private async fetchAllPages<T>(
    initialUrl: string,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<T[]> {
    const allItems: T[] = [];
    let url: string | null = initialUrl;

    while (url) {
      const data: SpotifyPaginatedResponse<T> = await this.fetchJson(url);
      allItems.push(...data.items);
      onProgress?.(allItems.length, data.total);
      url = data.next;

      if (url) {
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    return allItems;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    let retries = 0;

    while (true) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") || "1");
        await sleep(retryAfter * 1000);
        retries++;
        if (retries > 5) throw new Error("Rate limited too many times");
        continue;
      }

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      return response.json();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
