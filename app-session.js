const updateSessionUI = (user) => {
  const name = user?.name || user?.username || "Guest";
  document.querySelectorAll("[data-current-user]").forEach((node) => {
    node.textContent = name;
  });

  document.querySelectorAll("[data-logout-link]").forEach((node) => {
    if (!user) {
      node.classList.add("is-hidden");
    } else {
      node.classList.remove("is-hidden");
    }
  });
};

const loadSession = async () => {
  if (!window.assetTrackingApi) {
    updateSessionUI(null);
    return;
  }

  const token = window.assetTrackingApi.getToken();
  const storedUser = window.assetTrackingApi.getStoredUser();

  if (!token) {
    updateSessionUI(null);
    return;
  }

  if (storedUser) {
    updateSessionUI(storedUser);
    return;
  }

  try {
    const data = await window.assetTrackingApi.apiFetch("/api/me");
    window.assetTrackingApi.setStoredUser(data.user);
    updateSessionUI(data.user);
  } catch (error) {
    window.assetTrackingApi.setToken(null);
    window.assetTrackingApi.setStoredUser(null);
    updateSessionUI(null);
  }
};

loadSession();
