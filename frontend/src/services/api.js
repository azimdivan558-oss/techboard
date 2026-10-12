import axios from "axios";

const RAW_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

// Backend URL
export const SERVER_URL = RAW_BASE;

// Resume / uploaded file URL
export const resumeUrl = (path) => {
  if (!path) return null;

  // Cloudinary resumes are full https URLs
  if (/^https?:\/\//i.test(String(path))) return String(path);

  const cleanPath = String(path)
    .replace(/\\/g, "/")
    .replace(/^\/?/, "/");

  return `${SERVER_URL}${cleanPath}`;
};

// Main API instance
const API = axios.create({
  baseURL: `${RAW_BASE}/api`,
});

// Add JWT token automatically
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle unauthorized request
API.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return Promise.reject(error);
  }
);

export const api = API;

export default API;