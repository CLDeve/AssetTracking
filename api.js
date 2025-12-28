const API_BASE =
  window.ASSET_TRACKING_API || "https://assettracking.onrender.com";

const TOKEN_KEY = "assetTrackingToken";
const USER_KEY = "assetTrackingUser";

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const getStoredUser = () => {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    return null;
  }
};

const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
};

const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
};

window.assetTrackingApi = {
  apiFetch,
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,
  apiBase: API_BASE,
};
