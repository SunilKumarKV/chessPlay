import { BACKEND_URL } from "../config/runtime";

async function readJson(response) {
  return response.json().catch(() => ({}));
}

function clearSessionTokens() {
  sessionStorage.removeItem("chessplay_access_token");
  sessionStorage.removeItem("chessplay_socket_token");
}

function hasClientSessionHint() {
  return Boolean(
    sessionStorage.getItem("chessplay_access_token") ||
      sessionStorage.getItem("chessplay_socket_token") ||
      localStorage.getItem("user"),
  );
}

let refreshPromise = null;

async function request(endpoint, options = {}) {
  const hasBody = Boolean(options.body);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const fallbackAccessToken =
    sessionStorage.getItem("chessplay_access_token") ||
    sessionStorage.getItem("chessplay_socket_token");
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

async function refreshSessionOnce() {
  if (!refreshPromise) {
    refreshPromise = request("/api/auth/refresh", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) return { ok: false, data: await readJson(response) };
        const data = await readJson(response);
        if (data.socketToken) {
          sessionStorage.setItem("chessplay_access_token", data.socketToken);
          sessionStorage.setItem("chessplay_socket_token", data.socketToken);
        }
        return { ok: true, data };
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/**
 * Centralized fetch wrapper.
 * Auth is cookie-based. Do not store JWTs in localStorage.
 * On expired access token, it tries one refresh-token rotation before failing.
 */
export const apiClient = async (endpoint, options = {}) => {
  let response = await request(endpoint, options);

  const shouldRefresh =
    response.status === 401 &&
    endpoint !== "/api/auth/refresh" &&
    !options.skipAuthRefresh &&
    hasClientSessionHint();

  if (shouldRefresh) {
    const refreshResult = await refreshSessionOnce();
    if (refreshResult.ok) {
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
