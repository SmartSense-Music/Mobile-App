import { API_ENDPOINTS, CLOUDINARY_CONFIG } from "@/constants/config";

export type Song = {
  id: string;
  title: string;
  artist: string;
  url: string; // Cloudinary URL
  coverUrl?: string;
  duration: number; // in seconds
};

export type SongMetadata = {
  title: string;
  artist: string;
  timeOfDay: string[];
  environment: string[];
  location?: string;
};

export type SavedLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
};

// In-memory storage for uploaded songs (temporary until backend is connected)
let uploadedSongs: Song[] = [];
let savedLocations: SavedLocation[] = [];

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
      if (!uploadData.secure_url) {
        throw new Error("Cloudinary upload failed");
      }

      const audioUrl = uploadData.secure_url;
      const duration = uploadData.duration || 0;

      // Log details for verification instead of sending to backend
      console.log("----- UPLOAD SUCCESS -----");
      console.log("Title:", metadata.title);
      console.log("Cloudinary URL:", audioUrl);
      console.log("Full Payload:", {
        ...metadata,
        url: audioUrl,
        duration,
      });

      // Add to local list so it appears in the app immediately
      uploadedSongs.unshift({
        id: Date.now().toString(),
        title: metadata.title,
        artist: metadata.artist,
        url: audioUrl,
        duration: duration,
      });

      // 2. Save Metadata to Backend
      console.log("Saving metadata to backend:", API_ENDPOINTS.UPLOAD_METADATA);
      const backendResponse = await fetch(API_ENDPOINTS.UPLOAD_METADATA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: metadata.title,
          artist: metadata.artist,
          url: audioUrl,
          duration: duration,
          time_of_day: metadata.timeOfDay, // Mapping to snake_case if backend expects it
          environment: metadata.environment,
          location: metadata.location || "Unknown",
        }),
      });

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error("Backend upload failed:", errorText);
        // We don't throw here to avoid failing the whole process if just the metadata save fails,
        // but user might want to know. For now, let's log it.
        // If strict consistency is needed, we should throw.
        throw new Error(
          `Backend upload failed: ${backendResponse.status} ${errorText}`
        );
      }

      const backendData = await backendResponse.json();
      console.log("Backend save success:", backendData);

      return true;
    } catch (error) {
      console.error("Upload failed:", error);
      return false;
    }
  },

  async getSongs(context?: {
    environment?: string;
    timeOfDay?: string;
    location?: string;
  }): Promise<Song[]> {
    try {
      const queryParams = new URLSearchParams();
      if (context?.environment)
        queryParams.append("environment", context.environment);
      if (context?.timeOfDay)
        queryParams.append("timeOfDay", context.timeOfDay);
      if (context?.location) queryParams.append("location", context.location);

      const url = `${API_ENDPOINTS.GET_PLAYLISTS}?${queryParams.toString()}`;
      console.log("Fetching songs from:", url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch playlists: ${response.statusText}`);
      }

      const data = await response.json();

      // Map backend response to Song type
      // Assuming backend returns snake_case or similar.
      return data.map((item: any) => ({
        id: item.id?.toString() || Math.random().toString(),
        title: item.title || "Unknown Title",
        artist: item.artist || "Unknown Artist",
        url: item.url,
        coverUrl: item.cover_url,
        duration: item.duration || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch songs:", error);
      // Return local uploaded songs + mock data as fallback if backend fails
      return [
        ...uploadedSongs,
        {
          id: "1",
          title: "Morning Boost",
          artist: "SmartSense Mix",
          url: "https://res.cloudinary.com/demo/video/upload/v1/docs/guitar-strum.mp3",
          duration: 225,
        },
        {
          id: "2",
          title: "Focus Flow",
          artist: "Ambient Works",
          url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          duration: 360,
        },
      ];
    }
  },

  async getRecommendation(context: any): Promise<Song | null> {
    try {
      // const response = await fetch(API_ENDPOINTS.GET_RECOMMENDATIONS, {
      //   method: 'POST',
      //   body: JSON.stringify(context)
      // });
      // return await response.json();

      // Mock recommendation
      const songs = await this.getSongs();
      return songs[0];
    } catch (error) {
      console.error("Failed to get recommendation:", error);
      return null;
    }
  },

  async saveLocation(
    userId: string,
    location: Omit<SavedLocation, "id">
  ): Promise<SavedLocation | null> {
    try {
      const payload = {
        user_id: userId,
        location_name: location.name,
        lat: location.latitude,
        lng: location.longitude,
      };

      console.log("Saving location to backend:", payload);

      const response = await fetch(API_ENDPOINTS.GEOLOCATIONS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to save location: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      // Assuming backend returns the created location object with an ID
      const newLocation: SavedLocation = {
        id: data.id?.toString() || Date.now().toString(),
        name: data.location_name || location.name,
        latitude: data.lat || location.latitude,
        longitude: data.lng || location.longitude,
        address: location.address, // Backend might not return address if it only stores coords
      };

      savedLocations.push(newLocation);
      return newLocation;
    } catch (error) {
      console.error("Failed to save location:", error);
      return null;
    }
  },

  async getLocations(userId: string): Promise<SavedLocation[]> {
    try {
      const url = `${API_ENDPOINTS.GEOLOCATIONS}/${userId}`;

      console.log("Fetching locations from:", url);

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch locations: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      // Map backend response to SavedLocation type
      const mappedLocations: SavedLocation[] = data.map((item: any) => ({
        id: item.id?.toString() || Math.random().toString(),
        name: item.location_name || "Unknown",
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lng),
        address: item.address || "Unknown Address", // Optional if backend doesn't store it
      }));

      // Update local cache
      savedLocations = mappedLocations;
      return mappedLocations;
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      // Fallback to local cache if backend fails
      return savedLocations;
    }
  },

  async deleteLocation(id: string): Promise<boolean> {
    try {
      console.log("Deleting location from backend:", id);
      savedLocations = savedLocations.filter((l) => l.id !== id);
      return true;
    } catch (error) {
      console.error("Failed to delete location:", error);
      return false;
    }
  },
};
