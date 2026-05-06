const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

/**
 * Centralized fetch wrapper to handle authorization headers
 * and common error processing automatically.
 */
export const apiClient = async (endpoint, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "An API error occurred");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
