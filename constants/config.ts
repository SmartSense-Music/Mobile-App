export const BACKEND_URL = "https://smart-sense-music-backend.onrender.com";

export const CLOUDINARY_CONFIG = {
  cloudName: "dw3kp9uqn",
  uploadPreset: "smart_sense_upload", // Create an unsigned upload preset in Cloudinary settings
  uploadUrl: "https://api.cloudinary.com/v1_1/dw3kp9uqn/upload",
};

export const API_ENDPOINTS = {
  GET_SONGS: `${BACKEND_URL}/songs`,
  GET_RECOMMENDATIONS: `${BACKEND_URL}/recommendations`,
  UPLOAD_METADATA: `${BACKEND_URL}/api/playlists`,
  GET_PLAYLISTS: `${BACKEND_URL}/api/playlists`,
  GEOLOCATIONS: `${BACKEND_URL}/api/geolocations`,
};
