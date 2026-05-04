import { useEffect, useState } from "react";

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Failed to parse stored user:", error);
    return null;
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState(() => readStoredUser());

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "user") {
        setUser(readStoredUser());
      }
    };

    const handleLocalChange = () => {
      setUser(readStoredUser());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("localUserChanged", handleLocalChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("localUserChanged", handleLocalChange);
    };
  }, []);

  return {
    user,
    isLoggedIn: Boolean(user),
  };
}

export function notifyUserChanged() {
  window.dispatchEvent(new CustomEvent("localUserChanged"));
}
