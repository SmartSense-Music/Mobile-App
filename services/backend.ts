import { API_ENDPOINTS } from "@/constants/config";

export type UserData = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export const BackendService = {
  async syncSpotifyUser(user: UserData, refreshToken: string) {
    try {
      const response = await fetch(API_ENDPOINTS.SYNC_USER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          spotify_user_id: user.id,
          spotify_refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        console.warn("Backend sync warning:", await response.text());
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to sync user with backend:", error);
      return null;
    }
  },

  async playContextSong(accessToken: string, context: any) {
    // 1. Get song recommendation from backend based on context
    // 2. Play using Spotify Web API

    // For now, let's assume the backend returns a URI, or we just search Spotify directly.
    // If the user wants the backend to decide:
    try {
      const recResponse = await fetch(API_ENDPOINTS.GET_CONTEXT_SONG, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });

      if (recResponse.ok) {
        const { uri } = await recResponse.json();
        if (uri) {
          await SpotifyService.play(accessToken, uri);
        }
      }
    } catch (e) {
      console.log("Error fetching context song", e);
    }
  },
};

export const SpotifyService = {
  async getProfile(accessToken: string) {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return await response.json();
  },

  async play(accessToken: string, uri?: string) {
    const body = uri ? { uris: [uri] } : undefined; // If no URI, just resume
    await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async pause(accessToken: string) {
    await fetch("https://api.spotify.com/v1/me/player/pause", {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
