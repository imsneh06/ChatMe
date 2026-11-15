export const getBackendUrl = () => {
  // If running in the browser on a remote/production domain (like onrender.com)
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    // If VITE_BACKEND_URL is missing or accidentally set to localhost in the build
    if (!envUrl || envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
      return "https://chatme-backend-nc4m.onrender.com";
    }
    return envUrl;
  }

  // Local development
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";
};
