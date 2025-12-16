import { API_ENDPOINTS, CLOUDINARY_CONFIG } from "@/constants/config";

export type Song = {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  relevanceScore?: number;
  coverUrl?: string;
};

export type SongMetadata = {
  title: string;
  artist: string;
  timeOfDay: string[];
  environment: string[];
  userActions: string[];
  location?: string;
  userId: string;
};

export type SavedLocation = {
  address?: string;
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type TimeOfDay = {
  id: string;
  name: string;
};

export type Environment = {
  id: string;
  name: string;
};

export type UserAction = {
  id: string;
  name: string;
};

export const UserService = {
  async createUser(userId: string, emailAddress: string) {
    try {
      const response = await fetch(`${API_ENDPOINTS.USERS}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, emailAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
};

export const MusicService = {
  async uploadMusic(fileUri: string, metadata: SongMetadata): Promise<boolean> {
    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", {
        uri: fileUri,
        type: "audio/mpeg",
        name: "upload.mp3",
      } as any);
      formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

      const uploadResponse = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (!uploadData.secure_url) throw new Error("Cloudinary upload failed");

      // 2. Save to Backend
      const response = await fetch(API_ENDPOINTS.PLAYLISTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: metadata.title,
          artist: metadata.artist,
          url: uploadData.secure_url,
          duration: uploadData.duration || 0,
          action: metadata.userActions,
          environment: metadata.environment,
          timeOfDay: metadata.timeOfDay,
          location: metadata.location,
          userId: metadata.userId,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Upload failed:", error);
      return false;
    }
  },

  async getSongs(context?: {
    environment?: string;
    timeOfDay?: string;
    location?: string;
    action?: string;
    userId?: string;
  }): Promise<Song[]> {
    try {
      const response = await fetch(`${API_ENDPOINTS.PLAYLISTS}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment: context?.environment || null,
          timeOfDay: context?.timeOfDay || null,
          location: context?.location || null,
          action: context?.action || null,
          limit: 20,
          user: context?.userId,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch songs");

      const data = await response.json();
      return data.map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        artist: item.artist,
        url: item.url,
        duration: item.duration,
        relevanceScore: item.score,
      }));
    } catch (error) {
      console.error("Error fetching songs:", error);
      return [];
    }
  },
};

export const LocationService = {
  async saveLocation(
    userId: string,
    name: string,
    lat: number,
    lng: number
  ): Promise<SavedLocation | null> {
    try {
      const response = await fetch(API_ENDPOINTS.GEOLOCATIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          lat,
          lan: lng,
          userId,
        }),
      });
      console.log(userId);

      if (!response.ok) throw new Error("Failed to save location");
      const data = await response.json();
      const location = data.location;
      return {
        id: location.id.toString(),
        name: location.name,
        latitude: parseFloat(location.lat),
        longitude: parseFloat(location.lan),
      };
    } catch (error) {
      console.error("Error saving location:", error);
      return null;
    }
  },

  async getLocations(userId: string): Promise<SavedLocation[]> {
    try {
      const response = await fetch(`${API_ENDPOINTS.GEOLOCATIONS}/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data = await response.json();
      return data.map((item: any) => ({
        id: item.id.toString(),
        name: item.name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lan),
      }));
    } catch (error) {
      console.error("Error fetching locations:", error);
      return [];
    }
  },

  async deleteLocation(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_ENDPOINTS.GEOLOCATIONS}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete location");
      return true;
    } catch (error) {
      console.error("Error deleting location:", error);
      return false;
    }
  },
};

export const InteractionService = {
  async recordInteraction(
    userId: string,
    playlistId: string
  ): Promise<boolean | null> {
    try {
      const resp = await fetch(API_ENDPOINTS.INTERACTIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          playlist_id: playlistId,
        }),
      });

      if (!resp.ok) {
        console.error("Failed to record interaction, status:", resp.status);
        return null;
      }

      const data = await resp.json();
      // For like toggles the backend returns { liked: true|false }
      if (typeof data.liked === "boolean") return data.liked;
      // For non-like actions backend returns message; treat as no-op
      return null;
    } catch (error) {
      console.error("Error recording interaction:", error);
      return null;
    }
  },

  async toggleLike(
    userId: string,
    playlistId: string
  ): Promise<boolean | null> {
    return await this.recordInteraction(userId, playlistId);
  },
};

export const MetadataService = {
  async getTimeOfDay(): Promise<TimeOfDay[]> {
    try {
      const response = await fetch(`${API_ENDPOINTS.TIMEOFTHEDAY}`);
      if (!response.ok) throw new Error("Failed to fetch time of day");
      return await response.json();
    } catch (error) {
      console.error("Error fetching time of day:", error);
      return [];
    }
  },

  async getEnvironments(): Promise<Environment[]> {
    try {
      const response = await fetch(`${API_ENDPOINTS.ENVIRONMENTS}`);
      if (!response.ok) throw new Error("Failed to fetch environments");
      return await response.json();
    } catch (error) {
      console.error("Error fetching environments:", error);
      return [];
    }
  },

  async getUserActions(): Promise<UserAction[]> {
    try {
      const response = await fetch(`${API_ENDPOINTS.USERACTIONS}`);
      if (!response.ok) throw new Error("Failed to fetch user actions");
      return await response.json();
    } catch (error) {
      console.error("Error fetching user actions:", error);
      return [];
    }
  },
};
