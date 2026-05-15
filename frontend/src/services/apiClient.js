import { BACKEND_URL } from "../config/runtime";

async function readJson(response) {
  return response.json().catch(() => ({}));
}

function clearSessionTokens() {
  sessionStorage.removeItem("chessplay_access_token");
  sessionStorage.removeItem("chessplay_socket_token");
}

async function request(endpoint, options = {}) {
  const hasBody = Boolean(options.body);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const fallbackAccessToken = sessionStorage.getItem("chessplay_access_token") || sessionStorage.getItem("chessplay_socket_token");
  const headers = {
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(fallbackAccessToken ? { Authorization: `Bearer ${fallbackAccessToken}` } : {}),
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

  if (response.status === 401 && endpoint !== "/api/auth/refresh" && !options.skipAuthRefresh) {
    const refreshResponse = await request("/api/auth/refresh", { method: "POST" });
    if (refreshResponse.ok) {
      const refreshData = await readJson(refreshResponse);
      if (refreshData.socketToken) {
        sessionStorage.setItem("chessplay_access_token", refreshData.socketToken);
        sessionStorage.setItem("chessplay_socket_token", refreshData.socketToken);
      }
      response = await request(endpoint, options);
    } else {
      clearSessionTokens();
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
