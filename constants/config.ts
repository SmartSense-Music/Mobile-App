import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// TODO: Replace with your actual backend URL
export const BACKEND_URL = "http://YOUR_BACKEND_IP:3000";

export const API_ENDPOINTS = {
  SYNC_USER: `${BACKEND_URL}/users`,
  UPDATE_SPOTIFY: (userId: string) => `${BACKEND_URL}/users/${userId}/spotify`,
  GET_CONTEXT_SONG: `${BACKEND_URL}/context/song`, // Hypothetical endpoint
};

export const REDIRECT_URI = makeRedirectUri({
  scheme: "smartsense",
  path: "auth",
});

export const SPOTIFY_CONFIG = {
  clientId: "a8e594b735f54dfaa524d53a754c9b6d",
  scopes: [
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "streaming",
  ],
  discovery: {
    authorizationEndpoint: "https://accounts.spotify.com/authorize",
    tokenEndpoint: "https://accounts.spotify.com/api/token",
  },
};
