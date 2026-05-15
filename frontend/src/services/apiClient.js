import { BACKEND_URL } from "../config/runtime";

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  return fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

/**
 * Centralized fetch wrapper.
 * Auth is cookie-based. Do not store JWTs in localStorage.
 * On expired access token, it tries one refresh-token rotation before failing.
 */
export const apiClient = async (endpoint, options = {}) => {
  let response = await request(endpoint, options);

  if (response.status === 401 && endpoint !== "/api/auth/refresh") {
    const refreshResponse = await request("/api/auth/refresh", { method: "POST" });
    if (refreshResponse.ok) {
      response = await request(endpoint, options);
    }
  }

  const data = await readJson(response);

  if (!response.ok) {
    const error = new Error(data.message || "An API error occurred");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
