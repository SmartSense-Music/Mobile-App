import { SPOTIFY_CONFIG } from "@/constants/config";
import { BackendService, SpotifyService, UserData } from "@/services/backend";
import {
  makeRedirectUri,
  ResponseType,
  useAuthRequest,
} from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  user: UserData | null;
  spotifyToken: string | null;
  signInWithSpotify: () => void;
  signOut: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Spotify Auth Request
  const redirectUri = makeRedirectUri({
    scheme: "smartsense",
    path: "auth",
  });

  console.log("Redirect URI:", redirectUri);

  const [spotifyRequest, spotifyResponse, spotifyPromptAsync] = useAuthRequest(
    {
      clientId: SPOTIFY_CONFIG.clientId,
      scopes: SPOTIFY_CONFIG.scopes,
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true,
    },
    SPOTIFY_CONFIG.discovery
  );

  // Handle Spotify Response
  useEffect(() => {
    if (spotifyResponse?.type === "success") {
      const { code } = spotifyResponse.params;
      exchangeSpotifyCode(code, spotifyRequest?.codeVerifier);
    }
  }, [spotifyResponse]);

  const exchangeSpotifyCode = async (code: string, codeVerifier?: string) => {
    if (!codeVerifier) return;
    setIsLoading(true);
    try {
      const redirectUri = makeRedirectUri({
        scheme: "smartsense",
        path: "auth",
      });
      const response = await fetch(SPOTIFY_CONFIG.discovery.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: SPOTIFY_CONFIG.clientId,
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
      });

      const data = await response.json();
      if (data.access_token) {
        setSpotifyToken(data.access_token);

        // Get Spotify User ID
        const profile = await SpotifyService.getProfile(data.access_token);

        // Create User Data from Spotify Profile
        const userData: UserData = {
          id: profile.id,
          email: profile.email,
          name: profile.display_name,
          picture: profile.images?.[0]?.url,
        };

        setUser(userData);

        // Sync with backend (Store tokens and user info)
        console.log("Syncing Spotify User:", userData);
        await BackendService.syncSpotifyUser(userData, data.refresh_token);
      }
    } catch (error) {
      console.error("Failed to exchange spotify token", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithSpotify = () => {
    spotifyPromptAsync();
  };

  const signOut = () => {
    setUser(null);
    setSpotifyToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        spotifyToken,
        signInWithSpotify,
        signOut,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
