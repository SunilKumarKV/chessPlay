export function persistAuthSession(data) {
  localStorage.removeItem("token");

  if (data?.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  if (data?.socketToken) {
    sessionStorage.setItem("chessplay_access_token", data.socketToken);
    sessionStorage.setItem("chessplay_socket_token", data.socketToken);
  }
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("chessplay_access_token");
  sessionStorage.removeItem("chessplay_socket_token");
}
