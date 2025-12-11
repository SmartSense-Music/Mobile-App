export const BACKEND_URL = "http://192.168.8.125:3000";
//"https://smart-sense-music-backend.onrender.com";

export const CLOUDINARY_CONFIG = {
  cloudName: "dw3kp9uqn",
  uploadPreset: "smart_sense_upload", // Create an unsigned upload preset in Cloudinary settings
  uploadUrl: "https://api.cloudinary.com/v1_1/dw3kp9uqn/upload",
};

export const API_ENDPOINTS = {
  PLAYLISTS: `${BACKEND_URL}/api/musics`,
  GEOLOCATIONS: `${BACKEND_URL}/api/locations`,
  USERS: `${BACKEND_URL}/api/users`,
  INTERACTIONS: `${BACKEND_URL}/api/interactions`,
  TIMEOFTHEDAY: `${BACKEND_URL}/api/time-of-day`,
  ENVIRONMENTS: `${BACKEND_URL}/api/environments`,
  USERACTIONS: `${BACKEND_URL}/api/user-actions`,
};
